import { createFileRoute } from "@tanstack/react-router";

// 1x1 transparent GIF
const PIXEL = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

const pixelResponse = () =>
  new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });

export const Route = createFileRoute("/api/public/open/$recipientId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = String(params.recipientId ?? "").replace(/\.gif$/i, "");
        if (!/^[0-9a-f-]{36}$/i.test(id)) return pixelResponse();
        try {
          // Uses only the public (publishable) key — a database function records the open.
          const { createClient } = await import("@supabase/supabase-js");
          const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
          if (!url || !key) return pixelResponse();
          const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
          const { error } = await sb.rpc("record_email_open" as never, { _recipient_id: id } as never);
          if (error) console.error("open tracking failed", error.message);
        } catch (err) {
          console.error("open tracking failed", err);
        }
        return pixelResponse();
      },
    },
  },
});
