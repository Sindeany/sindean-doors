/**
 * Phase 2B-4B-7 — Work Order wizard must not deduct browser inventory.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("CreateWorkOrderWizard inventory neutrality", () => {
  const wizard = source("client/src/components/admin/CreateWorkOrderWizard.tsx");
  const store = source("client/src/stores/inventoryStore.ts");

  it("does not import or call consumeMaterialsForWorkOrder", () => {
    expect(wizard).not.toContain("consumeMaterialsForWorkOrder");
    expect(wizard).not.toContain("MaterialConsumption");
  });

  it("does not call server inventory.consumeForWorkOrder", () => {
    expect(wizard).not.toMatch(/inventory\.consumeForWorkOrder/);
    expect(wizard).not.toMatch(/trpc\.inventory\.consumeForWorkOrder/);
  });

  it("still creates work orders through workOrders.create", () => {
    expect(wizard).toContain("trpc.workOrders.create.useMutation");
    expect(wizard).toContain("createMutation.mutateAsync");
  });

  it("success messaging does not claim materials were deducted", () => {
    expect(wizard).toContain("تم إنشاء أمر التشغيل");
    expect(wizard).toContain("صرف المواد يتم لاحقًا من خلال إصدار المواد");
    expect(wizard).not.toContain("تم خصم المواد من المخزون");
  });

  it("step 3 availability panel remains informational and does not block on local stock", () => {
    expect(wizard).toContain("checkMaterialAvailability");
    expect(wizard).toContain("validateStep");
    const validate = wizard.slice(
      wizard.indexOf("function validateStep"),
      wizard.indexOf("const createMutation")
    );
    expect(validate).not.toContain("checkMaterialAvailability");
    expect(validate).not.toContain("allSufficient");
  });
});

describe("inventoryStore consume helper callers", () => {
  const store = source("client/src/stores/inventoryStore.ts");

  it("documents that consumeMaterialsForWorkOrder remains in the store but is unused by the wizard", () => {
    expect(store).toContain("export function consumeMaterialsForWorkOrder");
  });
});
