import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { acceptReviewedUnit, bomLineSubmit, lineUnitIsStale } from "../client/src/lib/legacyBomForm.ts";

describe("legacy BOM captured unit", () => {
  it("submits the unit captured with the quantity, not a later catalog unit", () => {
    const captured = { itemId: 4, quantity: 2, notes: "", unit: "piece", unitCost: 10 };
    expect(lineUnitIsStale(captured.unit, "mm")).toBe(true);
    expect(bomLineSubmit([captured])).toEqual([
      { itemId: 4, quantity: 2, notes: undefined, expectedUnit: "piece" },
    ]);
    const reviewed = acceptReviewedUnit(captured, { unit: "mm", unitCost: 12 });
    expect(reviewed).toMatchObject({ unit: "mm", quantity: 1, unitCost: 12 });
  });

  it("does not refresh the captured unit inside the form submit", () => {
    const source = readFileSync("client/src/components/admin/BOMForm.tsx", "utf8");
    const start = source.indexOf("const handleSubmit");
    const submit = source.slice(start, source.indexOf("if (editBomId)", start));
    expect(submit).toContain("bomLineSubmit(selectedItems)");
    expect(submit).not.toContain("expectedUnit: inventoryItems");
    expect(source).toContain("hydratedEdit.current");
  });
});
