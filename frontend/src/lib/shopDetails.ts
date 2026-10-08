import type { Merchant, ShopDetails } from "@kepter/sdk";

import { contactKind } from "./contact.ts";

export const MAX_NAME_BYTES = 48;
export const MAX_CITY_BYTES = 48;
export const MAX_CONTACT_BYTES = 80;

export interface DetailsDraft {
  name: string;
  category: number | null;
  city: string;
  contact: string;
}

export const EMPTY_DRAFT: DetailsDraft = { name: "", category: null, city: "", contact: "" };

export function draftFrom(merchant: Merchant): DetailsDraft {
  return { name: merchant.name, category: merchant.category, city: merchant.city, contact: merchant.contact };
}

function bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function checkDraft(draft: DetailsDraft) {
  const name = draft.name.trim();
  const city = draft.city.trim();
  const contact = draft.contact.trim();
  const errors = {
    name: bytes(name) > MAX_NAME_BYTES ? "Shop names must be 1 to 48 characters." : "",
    city: bytes(city) > MAX_CITY_BYTES ? "Keep it to 48 characters." : "",
    contact:
      bytes(contact) > MAX_CONTACT_BYTES
        ? "Keep it to 80 characters."
        : contact && !contactKind(contact)
          ? "Use a WhatsApp number that starts with + and your country code, or a website."
          : "",
  };
  const complete = name.length > 0 && city.length > 0 && draft.category !== null;
  const ok = complete && !errors.name && !errors.city && !errors.contact;
  const details: ShopDetails | undefined = ok ? { name, category: draft.category!, city, contact } : undefined;
  return { errors, details };
}
