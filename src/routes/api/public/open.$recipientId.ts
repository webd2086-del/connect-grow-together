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
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await supabaseAdmin
            .from("campaign_recipients")
            .select("id, user_id, campaign_id, prospect_id, open_count, opened_at, state")
            .eq("id", id)
            .maybeSingle();
          if (!row) return pixelResponse();

          const now = new Date().toISOString();
          await supabaseAdmin
            .from("campaign_recipients")
            .update({
              open_count: (row.open_count ?? 0) + 1,
              opened_at: row.opened_at ?? now,
              state: row.state === "replied" ? row.state : "opened",
            })
            .eq("id", id);

          if (!row.opened_at) {
            const { data: prospect } = await supabaseAdmin
              .from("prospects")
              .select("id, company, status, category_id")
              .eq("id", row.prospect_id)
              .maybeSingle();
            if (prospect) {
              if (["new", "contacted"].includes(prospect.status)) {
                await supabaseAdmin.from("prospects").update({ status: "opened" }).eq("id", prospect.id);
              }
              await supabaseAdmin.from("activities").insert({
                user_id: row.user_id,
                type: "email_opened",
                title: `${prospect.company} opened your email`,
                prospect_id: prospect.id,
                campaign_id: row.campaign_id,
                category_id: prospect.category_id,
                at: now,
              });
            }
          }
        } catch (err) {
          console.error("open tracking failed", err);
        }
        return pixelResponse();
      },
    },
  },
});
