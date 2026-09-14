// Shared merge-field logic so the preview in the UI matches exactly what is sent.

export interface MergeSource {
  company?: string | null;
  contactName?: string | null;
  email?: string | null;
  website?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
}

export function buildVars(p: MergeSource, senderName = ""): Record<string, string> {
  const company = p.company ?? "";
  const contact = p.contactName ?? "";
  const first = contact.trim().split(/\s+/)[0] ?? "";
  const location = [p.city, p.country].filter(Boolean).join(", ");
  return {
    first_name: first || company,
    contact_name: contact || company,
    full_name: contact || company,
    company,
    company_name: company,
    school_name: company,
    brand: company,
    email: p.email ?? "",
    website: p.website ?? "",
    industry: p.industry ?? "",
    city: p.city ?? "",
    country: p.country ?? "",
    location: location || (p.country ?? ""),
    sender_name: senderName,
  };
}

/** Replaces {{placeholders}}; unknown or empty ones vanish and leave clean punctuation. */
export function fillTemplate(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{\{\s*([a-z_0-9]+)\s*\}\}/gi, (_m, key: string) => vars[key.toLowerCase()] ?? "")
    .replace(/[ \t]+([.,!?])/g, "$1")
    .replace(/\b(in|at|from|for|to)\s+([.,!?])/gi, "$2")
    .replace(/[ \t]{2,}/g, " ");
}

/** Placeholders used in a template, for showing which fields matter. */
export function placeholdersIn(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([a-z_0-9]+)\s*\}\}/gi)) out.add((m[1] ?? "").toLowerCase());
  return [...out];
}
