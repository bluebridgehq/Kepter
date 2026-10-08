import type { ReactNode } from "react";
import { CATEGORIES } from "@kepter/sdk";

import { checkDraft, type DetailsDraft } from "../lib/shopDetails.ts";

function inputClass(bad: boolean) {
  return `min-h-14 rounded-[14px] border-[1.5px] bg-surface px-4 text-lg text-ink outline-none ${
    bad ? "border-bad" : "border-line focus:border-brand"
  }`;
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      {(error || hint) && <span className={`text-sm ${error ? "text-bad" : "text-ink-2"}`}>{error || hint}</span>}
    </div>
  );
}

export function ShopDetailsForm({ draft, onChange }: { draft: DetailsDraft; onChange: (draft: DetailsDraft) => void }) {
  const { errors } = checkDraft(draft);
  const set = (patch: Partial<DetailsDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <Field id="shop-name" label="Shop name" error={errors.name}>
        <input
          id="shop-name"
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Tola's Kitchen"
          autoComplete="organization"
          className={inputClass(!!errors.name)}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span id="shop-category" className="font-semibold">
          What do you sell?
        </span>
        <div role="group" aria-labelledby="shop-category" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const on = draft.category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => set({ category: c.id })}
                aria-pressed={on}
                className={`min-h-12 cursor-pointer rounded-[14px] border-[1.5px] px-3 text-left text-[15px] font-bold ${
                  on ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-ink"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <Field id="shop-city" label="City or area" hint="So people can find shops near the person they are gifting." error={errors.city}>
        <input
          id="shop-city"
          value={draft.city}
          onChange={(e) => set({ city: e.target.value })}
          placeholder="e.g. Yaba, Lagos"
          autoComplete="address-level2"
          className={inputClass(!!errors.city)}
        />
      </Field>

      <Field
        id="shop-contact"
        label="WhatsApp or website (optional)"
        hint="Customers use this to order online and pay with their gift card."
        error={errors.contact}
      >
        <input
          id="shop-contact"
          value={draft.contact}
          onChange={(e) => set({ contact: e.target.value })}
          placeholder="+234 801 234 5678"
          inputMode="url"
          autoComplete="off"
          className={inputClass(!!errors.contact)}
        />
      </Field>
    </div>
  );
}
