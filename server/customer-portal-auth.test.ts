/**
 * Customer portal reads are closed until an order has a verified account owner.
 * Registration and a matching email are not that proof.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET_NOTE = "INTERNAL-NOTE-77";
const SECRET_INVOICE = "INV-88421";
const SECRET_COMPLAINT = "SECRET-COMPLAINT-55";
const VICTIM_EMAIL = "victim@example.com";

const { validateAdminSession, memory } = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  memory: {
    acceptSession: true,
    doorReads: 0,
    invoiceReads: 0,
    complaintReads: 0,
  },
}));

vi.mock("./admin-sessions.js", () => ({
  validateAdminSession,
}));

vi.mock("./db.js", async () => {
  const schema = await import("../drizzle/schema.js");
  const victimEmail = "victim@example.com";
  const user = {
    id: 5,
    name: "عميل",
    email: victimEmail,
    phone: "0500000099",
    passwordHash: "hashed-secret",
    wishlistIds: [3],
    createdAt: 1,
    updatedAt: 1,
  };
  const order = {
    id: 7,
    customerName: "ضحية",
    customerPhone: "0500000099",
    customerEmail: victimEmail,
    productId: "door-1",
    productName: "باب خاص",
    selections: { finish: "oak" },
    subSelections: {},
    dimensions: { width: 90 },
    basePrice: 1000,
    totalPrice: 44000,
    status: "confirmed",
    workflowStage: "cutting",
    paymentStatus: "partial",
    notes: "INTERNAL-NOTE-77",
    commercialStatus: "approved",
    materialState: "fully_reserved",
    acceptedTotalMinor: 4400000n,
    reservationAdvancePolicyId: 3,
    canonicalNumber: "SD-2026-000077",
    createdAt: 10,
    updatedAt: 10,
  };
  const invoice = {
    id: 9,
    sourceType: "door_order",
    sourceId: 7,
    invoiceNumber: "INV-88421",
    buyerName: "ضحية",
    buyerPhone: "0500000099",
    totalHalala: 4400000,
  };
  const complaint = {
    id: 4,
    distributorName: victimEmail,
    orderNumber: "SD-2026-000077",
    description: "SECRET-COMPLAINT-55",
    product: "باب خاص",
    type: "quality",
    status: "open",
  };

  function productChain() {
    const api = {
      from() {
        return api;
      },
      where() {
        return api;
      },
      orderBy() {
        return Promise.resolve([
          {
            id: 1,
            sku: "CAT-1",
            name: "باب الكتالوج",
            nameEn: "Catalog door",
            category: "interior",
            subcategory: null,
            woodType: null,
            status: "active",
            basePrice: 100,
            distributorPrice: 80,
            tiers: [],
            image: "",
            images: [],
            sizes: [],
            colors: [],
            stock: 1,
            badge: "",
            badgeColor: "",
            features: [],
            description: "عام",
            specs: [],
            dimensions: "",
            rating: 0,
            reviewCount: 0,
            inStock: true,
            isNew: false,
            isBestseller: false,
            isCertified: false,
            tags: [],
            weight: "",
            warranty: "",
            options: null,
            createdAt: 1,
            updatedAt: 1,
          },
        ]);
      },
    };
    return api;
  }

  return {
    schema,
    pool: {},
    db: {
      select() {
        return productChain();
      },
      query: {
        userSessions: {
          async findFirst() {
            if (!memory.acceptSession) return undefined;
            return {
              id: 1,
              userId: user.id,
              token: "customer-session",
              expiresAt: Date.now() + 60_000,
              createdAt: 1,
            };
          },
        },
        users: {
          async findFirst() {
            return user;
          },
        },
        doorOrders: {
          async findMany() {
            memory.doorReads += 1;
            return [order];
          },
          async findFirst() {
            memory.doorReads += 1;
            return order;
          },
        },
        taxInvoices: {
          async findFirst() {
            memory.invoiceReads += 1;
            return invoice;
          },
        },
        complaints: {
          async findMany() {
            memory.complaintReads += 1;
            return [complaint];
          },
        },
        complaintMessages: {
          async findMany() {
            memory.complaintReads += 1;
            return [{ id: 8, complaintId: 4, text: "SECRET-COMPLAINT-55", from: "distributor" }];
          },
        },
      },
    },
  };
});

import { appRouter } from "./routers.js";

function customer() {
  return appRouter.createCaller({ userToken: "customer-session" });
}

beforeEach(() => {
  memory.acceptSession = true;
  memory.doorReads = 0;
  memory.invoiceReads = 0;
  memory.complaintReads = 0;
  validateAdminSession.mockReset();
  validateAdminSession.mockImplementation(async (token: string | undefined) => token === "admin-token");
});

describe("customer portal order ownership", () => {
  it("does not return a historical order for an unverified matching email", async () => {
    const orders = await customer().customerPortal.myOrders();
    expect(orders).toEqual([]);
    expect(JSON.stringify(orders)).not.toContain(SECRET_NOTE);
    expect(JSON.stringify(orders)).not.toContain("commercialStatus");
    expect(JSON.stringify(orders)).not.toContain("44000");
    expect(memory.doorReads).toBe(0);
  });

  it("does not reveal an order when the caller supplies its id", async () => {
    await expect(customer().customerPortal.orderInvoice({ orderId: 7 })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "غير مصرح",
    });
    expect(memory.doorReads).toBe(0);
    expect(memory.invoiceReads).toBe(0);
  });

  it("does not return another customer's invoice or confirm that it exists", async () => {
    const error = await customer().customerPortal.orderInvoice({ orderId: 7 }).then(
      () => {
        throw new Error("invoice was returned");
      },
      (caught: unknown) => caught
    );
    const serialized = JSON.stringify(error);
    expect(serialized).not.toContain(SECRET_INVOICE);
    expect(serialized).not.toContain(SECRET_NOTE);
    expect(serialized).not.toContain("44000");
    expect(serialized).not.toContain("0500000099");
    expect(serialized).not.toContain(VICTIM_EMAIL);
    expect(serialized).not.toContain("موجود");
  });

  it("does not return complaints matched only by email", async () => {
    const complaints = await customer().customerPortal.myComplaints();
    expect(complaints).toEqual([]);
    expect(JSON.stringify(complaints)).not.toContain(SECRET_COMPLAINT);
    expect(memory.complaintReads).toBe(0);
  });

  it("keeps the customer profile and the public catalog available", async () => {
    const me = await customer().users.me();
    expect(me).toMatchObject({ id: 5, email: VICTIM_EMAIL, name: "عميل" });
    expect(me).not.toHaveProperty("passwordHash");

    const products = await appRouter.createCaller({}).products.list();
    expect(products.map((product) => product.name)).toContain("باب الكتالوج");
  });

  it("rejects anonymous and invalid sessions before reading private records", async () => {
    await expect(appRouter.createCaller({}).customerPortal.myOrders()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      appRouter.createCaller({}).customerPortal.orderInvoice({ orderId: 7 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    memory.acceptSession = false;
    await expect(customer().customerPortal.myOrders()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(customer().customerPortal.myComplaints()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(memory.doorReads).toBe(0);
    expect(memory.invoiceReads).toBe(0);
    expect(memory.complaintReads).toBe(0);
  });

  it("still lets an authorized admin list factory orders", async () => {
    const orders = await appRouter.createCaller({ adminToken: "admin-token" }).orders.list();
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      id: 7,
      notes: SECRET_NOTE,
      commercialStatus: "approved",
    });
    expect(memory.doorReads).toBe(1);
  });
});
