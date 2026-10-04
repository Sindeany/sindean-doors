/**
 * Batch 1 security lockdown.
 * Calls the real tRPC procedures and the real upload handler.
 */
import fs from "fs";
import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const { insertedRows } = vi.hoisted(() => ({
  insertedRows: [] as unknown[],
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  const session = {
    id: 1,
    token: "valid-admin-token",
    expiresAt: Date.now() + 60 * 60 * 1000,
    createdAt: Date.now(),
  };
  const limit = vi.fn(async () => [session]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return {
    schema,
    db: {
      select: vi.fn(() => ({ from })),
      insert: vi.fn(() => ({
        values: vi.fn(async (row: unknown) => {
          insertedRows.push(row);
          return [{ insertId: 99 }];
        }),
      })),
    },
  };
});

import { appRouter } from "./routers.js";
import { handleImageUpload } from "./upload-handler.js";

const ADMIN_MESSAGE = "غير مصرح: يرجى تسجيل الدخول كمدير";
const SUPPLIER_MESSAGE = "يرجى تسجيل الدخول";

const orderInput = {
  customerName: "عميل تجريبي",
  customerPhone: "0500000000",
  productId: "door-1",
  productName: "باب سنديان",
  selections: { finish: "oak" },
  subSelections: {},
};

const anonymous = appRouter.createCaller({});
const customer = appRouter.createCaller({
  userToken: "customer-session-token",
});
const admin = appRouter.createCaller({
  adminToken: "valid-admin-token",
});

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function mockRes() {
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      this.headersSent = true;
      return this;
    },
  };
  return res;
}

async function expectUnauthorized(
  promise: Promise<unknown>,
  message: string
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    code: "UNAUTHORIZED",
    message,
  });
}

describe("orders.create temporary admin gate", () => {
  it("rejects an anonymous caller", async () => {
    const before = insertedRows.length;
    await expectUnauthorized(anonymous.orders.create(orderInput), ADMIN_MESSAGE);
    expect(insertedRows.length).toBe(before);
  });

  it("rejects an authenticated customer session", async () => {
    const before = insertedRows.length;
    await expectUnauthorized(customer.orders.create(orderInput), ADMIN_MESSAGE);
    expect(insertedRows.length).toBe(before);
  });

  it("allows an authenticated admin session on the temporary path", async () => {
    const before = insertedRows.length;
    const result = await admin.orders.create(orderInput);
    expect(result).toEqual({ id: 99, success: true });
    expect(insertedRows.length).toBe(before + 1);
    expect(insertedRows.at(-1)).toMatchObject({
      customerName: orderInput.customerName,
      customerPhone: orderInput.customerPhone,
      productName: orderInput.productName,
      status: "new",
    });
  });
});

describe("RFQ and purchase order admin gate", () => {
  it("rejects anonymous create", async () => {
    await expectUnauthorized(
      anonymous.rfq.create({
        title: "طلب عرض",
        items: [{ name: "خشب", qty: 1 }],
        submissionDeadline: Date.now() + 86_400_000,
      }),
      ADMIN_MESSAGE
    );
  });

  it("rejects anonymous update", async () => {
    await expectUnauthorized(
      anonymous.rfq.update({ id: 1, title: "تعديل" }),
      ADMIN_MESSAGE
    );
  });

  it("rejects anonymous sendInvitations", async () => {
    await expectUnauthorized(
      anonymous.rfq.sendInvitations({ rfqId: 1, supplierIds: [1] }),
      ADMIN_MESSAGE
    );
  });

  it("rejects anonymous evaluateWithAI", async () => {
    await expectUnauthorized(
      anonymous.rfq.evaluateWithAI({ rfqId: 1 }),
      ADMIN_MESSAGE
    );
  });

  it("rejects anonymous award", async () => {
    await expectUnauthorized(
      anonymous.rfq.award({ rfqId: 1, quoteId: 1 }),
      ADMIN_MESSAGE
    );
  });

  it("rejects anonymous updatePOStatus", async () => {
    await expectUnauthorized(
      anonymous.rfq.updatePOStatus({ id: 1, status: "confirmed" }),
      ADMIN_MESSAGE
    );
  });

  it("rejects anonymous updateQuoteStatus", async () => {
    await expectUnauthorized(
      anonymous.rfq.updateQuoteStatus({ id: 1, status: "under_review" }),
      ADMIN_MESSAGE
    );
  });

  it("rejects anonymous list", async () => {
    await expectUnauthorized(anonymous.rfq.list(), ADMIN_MESSAGE);
  });

  it("rejects anonymous getById", async () => {
    await expectUnauthorized(anonymous.rfq.getById({ id: 1 }), ADMIN_MESSAGE);
  });

  it("rejects anonymous listPurchaseOrders", async () => {
    await expectUnauthorized(
      anonymous.rfq.listPurchaseOrders(),
      ADMIN_MESSAGE
    );
  });
});

describe("supplier-authenticated RFQ paths", () => {
  it("still requires a supplier session for submitQuote", async () => {
    await expectUnauthorized(
      anonymous.rfq.submitQuote({
        rfqId: 1,
        totalPrice: 100,
        lineItems: [],
      }),
      SUPPLIER_MESSAGE
    );
  });

  it("still requires a supplier session for respondToInvitation", async () => {
    await expectUnauthorized(
      anonymous.rfq.respondToInvitation({
        invitationId: 1,
        response: "accepted",
      }),
      SUPPLIER_MESSAGE
    );
  });

  it("still requires a supplier session for markInvitationViewed", async () => {
    await expectUnauthorized(
      anonymous.rfq.markInvitationViewed({ invitationId: 1 }),
      SUPPLIER_MESSAGE
    );
  });
});

describe("POST /api/upload", () => {
  it("rejects an unauthenticated request and does not write a file", async () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    const res = mockRes();
    await handleImageUpload(
      {
        cookies: {},
        headers: {},
        body: { data: PNG_DATA_URL, filename: "lockdown" },
      } as unknown as Request,
      res as unknown as Response,
      "C:\\tmp\\sindean-uploads"
    );
    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ error: "UNAUTHORIZED" });
    expect(writeSpy).not.toHaveBeenCalled();
    writeSpy.mockRestore();
  });

  it("keeps MIME rejection after an admin session is present", async () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    const res = mockRes();
    await handleImageUpload(
      {
        cookies: { adminSession: "valid-admin-token" },
        headers: {},
        body: { data: "data:text/plain;base64,YQ==", filename: "notes" },
      } as unknown as Request,
      res as unknown as Response,
      "C:\\tmp\\sindean-uploads"
    );
    expect(res.statusCode).toBe(415);
    expect(writeSpy).not.toHaveBeenCalled();
    writeSpy.mockRestore();
  });
});

describe("customerPortal.trackOrder", () => {
  it("rejects an anonymous caller and returns no order payload", async () => {
    const promise = anonymous.customerPortal.trackOrder({
      identifier: "0500000000",
    });
    await expectUnauthorized(promise, "غير مصرح");
    await promise.catch((error: unknown) => {
      const serialized = JSON.stringify(error);
      expect(serialized).not.toContain("totalPrice");
      expect(serialized).not.toContain("workflowStage");
      expect(serialized).not.toContain("paymentStatus");
      expect(serialized).not.toContain("productName");
    });
  });

  it("rejects an email lookup with no order payload", async () => {
    await expect(
      anonymous.customerPortal.trackOrder({
        identifier: "customer@example.com",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not return orders for a customer session either", async () => {
    await expect(
      customer.customerPortal.trackOrder({ identifier: "0500000000" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
