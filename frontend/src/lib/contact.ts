const PHONE = /^\+[\d\s()-]{7,}$/;
const WEBSITE = /^(https?:\/\/)?[^\s/]+\.[^\s]{2,}$/i;

export type ContactKind = "whatsapp" | "website";

export function contactKind(contact: string): ContactKind | undefined {
  const value = contact.trim();
  if (PHONE.test(value)) return "whatsapp";
  if (WEBSITE.test(value)) return "website";
  return undefined;
}

/** A link that opens the shop's WhatsApp chat (with an optional message) or website. */
export function contactUrl(contact: string, message?: string): string | undefined {
  const value = contact.trim();
  const kind = contactKind(value);
  if (kind === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  }
  if (kind === "website") return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return undefined;
}

/** How the contact reads on a page, such as "WhatsApp +234 801 234 5678" or "tolas.com". */
export function contactLabel(contact: string): string {
  const value = contact.trim();
  if (contactKind(value) === "whatsapp") return `WhatsApp ${value}`;
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
