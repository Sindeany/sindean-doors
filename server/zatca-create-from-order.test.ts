/**
 * Legacy ZATCA createFromOrder must not invoice a lifecycle-managed door order.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  commercialStatus: null as string | null,
  found: true,
  locks: [] as string[],
  invoices: [] as number[],
}));

vi.mock("./zatca.service.js", () => ({
  createInvoiceFromOrder: vi.fn(async (orderId: number) => {
    state.invoices.push(orderId);
    return { invoiceId: 1, invoiceNumber: "SIND-TEST", skipped: false };
  }),
  buildZatcaQRData: vi.fn(),
  submitToZatcaPortal: vi.fn(),
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  const session = {
    id: 1,
    token: "valid-admin-token",
    expiresAt: Date.now() + 60 * 60 * 1000,
    createdAt: Date.now(),
  };
  return {
    schema,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [session],
          }),
        }),
      }),
      transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          select: () => ({
            from: (table: unknown) => {
              if (table !== schema.doorOrders) {
                throw new Error("createFromOrder locked an unexpected table");
              }
              return {
                where: () => ({
                  for: (mode: string) => ({
                    limit: async () => {
                      state.locks.push(mode);
                      if (!state.found) return [];
                      return [{ commercialStatus: state.commercialStatus }];
                    },
                  }),
                }),
              };
            },
          }),
        }),
    },
  };
});

import { zatcaRouter } from "./zatca.router.js";

const admin = zatcaRouter.createCaller({ adminToken: "valid-admin-token" });

beforeEach(() => {
  state.commercialStatus = null;
  state.found = true;
  state.locks = [];
  state.invoices = [];
});

describe("zatca.createFromOrder lifecycle guard", () => {
  it("blocks a lifecycle draft before any invoice call", async () => {
    state.commercialStatus = "draft";
    await expect(admin.createFromOrder({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.locks).toEqual(["update"]);
    expect(state.invoices).toEqual([]);
  });

  it("also blocks an approved lifecycle order", async () => {
    state.commercialStatus = "approved";
    await expect(admin.createFromOrder({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.locks).toEqual(["update"]);
    expect(state.invoices).toEqual([]);
  });

  it("keeps the old path for a historical order with null commercial status", async () => {
    state.commercialStatus = null;
    await expect(admin.createFromOrder({ orderId: 7 })).resolves.toMatchObject({
      invoiceId: 1,
    });
    expect(state.locks).toEqual(["update"]);
    expect(state.invoices).toEqual([7]);
  });
});
