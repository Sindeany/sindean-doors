/**
 * Phase 2B-4B-3 — inventory edit UI wiring (source checks).
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("inventory edit form balance UX", () => {
  const form = source("client/src/components/admin/InventoryFormModal.tsx");
  const page = source("client/src/pages/admin/AdminInventory.tsx");

  it("shows read-only current quantity when editing an existing item", () => {
    expect(form).toContain("readOnly");
    expect(form).toContain("disabled");
    expect(form).toMatch(/isNew\s*\?\s*\(/);
    expect(form).not.toMatch(/key:\s*"currentQty".*minQty/s);
  });

  it("communicates that balance changes use inventory movements", () => {
    expect(form).toContain("الرصيد الحالي يُعدّل من خلال حركات المخزون فقط");
  });

  it("does not send currentQty on inventory.update from the admin page", () => {
    expect(page).toContain("currentQty: _ignoredQty");
    expect(page).toContain("...metadata");
  });
});
