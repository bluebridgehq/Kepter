import { test } from "node:test";
import assert from "node:assert/strict";

import { CATEGORIES, categoryName } from "../src/categories.ts";

test("category ids are unique and fit the contract's limit", () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => Number.isInteger(id) && id >= 0 && id < 32));
});

test("unknown categories read as Other", () => {
  assert.equal(categoryName(1), "Food and drinks");
  assert.equal(categoryName(30), "Other");
});
