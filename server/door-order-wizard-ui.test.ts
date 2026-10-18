/**
 * The public door wizard must not be a canonical factory-order screen.
 * A staff cookie in the same browser is not an order-entry UI.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("DoorOrderWizard canonical create boundary", () => {
  const wizard = source("client/src/components/DoorOrderWizard.tsx");
  const productPage = source("client/src/pages/ProductDetail.tsx");

  it("does not call canonical orders.create from the customer wizard or product page", () => {
    expect(wizard).not.toContain("orders.create");
    expect(wizard).not.toContain("trpc.orders");
    expect(productPage).not.toContain("orders.create");
    expect(productPage).not.toContain("trpc.orders");
  });

  it("does not treat a staff cookie as permission to submit a factory order", () => {
    expect(wizard).not.toContain("staffSession");
    expect(wizard).not.toContain("staffAuth");
    expect(wizard).not.toContain("sales_person");
    expect(wizard).not.toContain("sales_coordinator");
    expect(wizard).toContain("هذه الصفحة لا تنشئ طلب مصنع");
    expect(wizard).toContain("إرسال غير متاح");
  });
});
