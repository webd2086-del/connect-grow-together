// Server-only minimal SMTP client.
// Works on Node (dev) via node:net/node:tls and on Cloudflare Workers via cloudflare:sockets.

export interface SmtpConfig {
  host: string;
  port: number;
  /** true = implicit TLS (usually port 465); false = plain + STARTTLS (usually 587) */
  secure: boolean;
  user: string;
  pass: string;
}

export interface SmtpMessage {
  from: string;
  fromName?: string | undefined;
  to: string;
  subject: string;
  text: string;
  replyTo?: string | undefined;
}

interface Conn {
  write(s: string): Promise<void>;
  read(): Promise<string>;
  upgrade(host: string): Promise<Conn>;
  close(): Promise<void>;
}

const TIMEOUT_MS = 20000;

function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timed out while ${label}`)), TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/* ------------------------------- Node socket ------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
function wrapNodeSocket(socket: any): Conn {
  const queue: string[] = [];
  let pending: ((v: string) => void) | null = null;
  let failure: Error | null = null;
  let detached = false;

  const push = (s: string) => {
    if (detached) return;
    if (pending) {
      const r = pending;
      pending = null;
      r(s);
    } else queue.push(s);
  };
  const onData = (d: Buffer) => push(d.toString("utf8"));
  const onError = (e: Error) => {
    failure = e;
    push("");
  };
  const onClose = () => push("");

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", onClose);

  const detach = () => {
    detached = true;
    socket.off("data", onData);
    socket.off("error", onError);
    socket.off("close", onClose);
  };

  return {
    async write(s) {
      await new Promise<void>((resolve, reject) => {
        socket.write(s, (e?: Error | null) => (e ? reject(e) : resolve()));
      });
    },
    read() {
      if (failure) return Promise.reject(failure);
      const next = queue.shift();
      if (next !== undefined) return Promise.resolve(next);
      return withTimeout(
        new Promise<string>((resolve) => {
          pending = resolve;
        }),
        "waiting for the mail server",
      ).then((v) => {
        if (failure) throw failure;
        return v;
      });
    },
    async upgrade(host) {
      const tls = await import("node:tls");
      detach();
      const secured: any = await new Promise((resolve, reject) => {
        const s = tls.connect({ socket, servername: host, rejectUnauthorized: false }, () => resolve(s));
        s.once("error", reject);
      });
      return wrapNodeSocket(secured);
    },
    async close() {
      try {
        socket.end();
        socket.destroy();
      } catch {
        /* ignore */
      }
    },
  };
}

async function nodeConnect(host: string, port: number, secure: boolean): Promise<Conn> {
  if (secure) {
    const tls = await import("node:tls");
    const socket: any = await withTimeout(
      new Promise((resolve, reject) => {
        const s = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => resolve(s));
        s.once("error", reject);
      }),
      "connecting to the mail server",
    );
    return wrapNodeSocket(socket);
  }
  const net = await import("node:net");
  const socket: any = await withTimeout(
    new Promise((resolve, reject) => {
      const s = net.connect({ host, port }, () => resolve(s));
      s.once("error", reject);
    }),
    "connecting to the mail server",
  );
  return wrapNodeSocket(socket);
}

/* --------------------------- Cloudflare socket ---------------------------- */

function wrapCfSocket(socket: any): Conn {
  const decoder = new TextDecoder();
  let reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();
  const encoder = new TextEncoder();

  return {
    async write(s) {
      await writer.write(encoder.encode(s));
    },
    async read() {
      const { value, done } = (await withTimeout(
        reader.read() as Promise<{ value?: Uint8Array; done: boolean }>,
        "waiting for the mail server",
      )) as { value?: Uint8Array; done: boolean };
      if (done || !value) return "";
      return decoder.decode(value as Uint8Array);
    },
    async upgrade(_host) {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
      await writer.close().catch(() => undefined);
      writer.releaseLock();
      const secured = socket.startTls();
      return wrapCfSocket(secured);
    },
    async close() {
      try {
        await socket.close();
      } catch {
        /* ignore */
      }
    },
  };
}

async function cfConnect(host: string, port: number, secure: boolean): Promise<Conn | null> {
  try {
    const specifier = "cloudflare:sockets";
    const mod: any = await import(/* @vite-ignore */ specifier);
    if (!mod?.connect) return null;
    const socket = mod.connect(
      { hostname: host, port },
      { secureTransport: secure ? "on" : "starttls", allowHalfOpen: false },
    );
    return wrapCfSocket(socket);
  } catch {
    return null;
  }
}

async function openConn(host: string, port: number, secure: boolean): Promise<Conn> {
  const cf = await cfConnect(host, port, secure);
  if (cf) return cf;
  return nodeConnect(host, port, secure);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* -------------------------------- protocol -------------------------------- */

const isComplete = (buf: string) => /(^|\n)\d{3} [^\n]*\r?\n$/.test(buf);

async function readReply(conn: Conn): Promise<{ code: number; text: string }> {
  let buf = "";
  while (!isComplete(buf)) {
    const chunk = await conn.read();
    if (!chunk) break;
    buf += chunk;
  }
  const code = Number(buf.slice(0, 3));
  return { code: Number.isFinite(code) ? code : 0, text: buf.trim() };
}

async function cmd(conn: Conn, line: string, expect: number[], label: string) {
  await conn.write(`${line}\r\n`);
  const reply = await readReply(conn);
  if (!expect.includes(Math.floor(reply.code))) {
    throw new Error(`${label} failed: ${reply.text || "no response from the mail server"}`);
  }
  return reply;
}

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

const headerValue = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

export interface SmtpSession {
  send(msg: SmtpMessage): Promise<void>;
  quit(): Promise<void>;
}

export async function openSmtpSession(cfg: SmtpConfig): Promise<SmtpSession> {
  const conn = await openConn(cfg.host, cfg.port, cfg.secure);
  const greeting = await readReply(conn);
  if (greeting.code !== 220) {
    await conn.close();
    throw new Error(`Mail server refused the connection: ${greeting.text || "no greeting"}`);
  }

  let active = conn;
  let ehlo = await cmd(active, `EHLO outreachos`, [250], "EHLO");

  if (!cfg.secure && /STARTTLS/i.test(ehlo.text)) {
    await cmd(active, "STARTTLS", [220], "STARTTLS");
    active = await active.upgrade(cfg.host);
    ehlo = await cmd(active, `EHLO outreachos`, [250], "EHLO");
  }

  if (/AUTH[^\n]*LOGIN/i.test(ehlo.text)) {
    await cmd(active, "AUTH LOGIN", [334], "Sign in");
    await cmd(active, b64(cfg.user), [334], "Sign in (username)");
    await cmd(active, b64(cfg.pass), [235], "Sign in (password)");
  } else {
    await cmd(active, `AUTH PLAIN ${b64(`\u0000${cfg.user}\u0000${cfg.pass}`)}`, [235], "Sign in");
  }

  return {
    async send(msg) {
      await cmd(active, `MAIL FROM:<${msg.from}>`, [250], "Sender address");
      await cmd(active, `RCPT TO:<${msg.to}>`, [250, 251], `Recipient ${msg.to}`);
      await cmd(active, "DATA", [354], "DATA");

      const headers = [
        `From: ${msg.fromName ? `${headerValue(msg.fromName)} <${msg.from}>` : msg.from}`,
        `To: ${msg.to}`,
        `Subject: ${headerValue(msg.subject)}`,
        `Date: ${new Date().toUTCString()}`,
        "MIME-Version: 1.0",
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: 8bit",
      ];
      if (msg.replyTo) headers.push(`Reply-To: ${msg.replyTo}`);

      const body = msg.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
      await connWrite(active, `${headers.join("\r\n")}\r\n\r\n${body}\r\n.\r\n`);
      const reply = await readReply(active);
      if (Math.floor(reply.code) !== 250) throw new Error(`Message rejected: ${reply.text}`);
    },
    async quit() {
      try {
        await active.write("QUIT\r\n");
        await active.read();
      } catch {
        /* ignore */
      }
      await active.close();
    },
  };
}

async function connWrite(conn: Conn, payload: string) {
  await conn.write(payload);
}

/** Opens a session, authenticates and closes it. Throws with a readable message on failure. */
export async function smtpVerify(cfg: SmtpConfig): Promise<void> {
  const session = await openSmtpSession(cfg);
  await session.quit();
}
