export interface Category {
  id: number;
  name: string;
}

/**
 * Shop categories. The contract stores only the id and accepts 0 to 31, so new
 * categories can be added here without a contract change. Never reuse an id.
 */
export const CATEGORIES: readonly Category[] = [
  { id: 1, name: "Food and drinks" },
  { id: 2, name: "Groceries" },
  { id: 3, name: "Fashion" },
  { id: 4, name: "Shoes and bags" },
  { id: 5, name: "Barber and beauty" },
  { id: 6, name: "Health and pharmacy" },
  { id: 7, name: "Phones and gadgets" },
  { id: 8, name: "Services" },
  { id: 0, name: "Other" },
];

export function categoryName(id: number): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? "Other";
}
