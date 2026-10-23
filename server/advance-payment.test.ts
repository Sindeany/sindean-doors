/**
 * Advance payment eligibility.
 * Procedures run against an in-memory locked order, policy, and payment log.
 * InnoDB concurrency is rehearsed separately and is not part of pnpm test.
 */
import { readFileSync } from "fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema.js";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";
import {
  ACCEPTED_TOTAL_SET_EVENT,
  ADVANCE_POLICY_PUBLISHED_EVENT,
  MAX_SIGNED_BIGINT,
  PAYMENT_RECORDED_EVENT,
  AdvancePaymentError,
  remainingAdvanceMinor,
  requiredAdvanceMinor,
} from "./advance-payment.js";

type OrderRow = {
  id: number;
  canonicalNumber: string | null;
  commercialStatus: string | null;
  materialState: string;
  acceptedTotalMinor: bigint | null;
  paymentStatus: string;
  status: string;
  updatedAt: number;
  customerName: string;
};

type PolicyRow = {
  id: number;
  requiredAdvanceBps: number;
  publishedByStaffUserId: number;
  publishedAt: number;
  supersededAt: number | null;
  isCurrent: number | null;
};

type PaymentRow = {
  id: number;
  doorOrderId: number;
  amountMinor: bigint;
  reference: string | null;
  recordedByStaffUserId: number;
  receivedAt: number;
  createdAt: number;
};

type AuditRow = Record<string, unknown> & { id: number };

const state = vi.hoisted(() => ({
  orders: new Map<number, OrderRow>(),
  policies: [] as PolicyRow[],
  payments: [] as PaymentRow[],
  audits: [] as AuditRow[],
  orderSets: [] as Array<Record<string, unknown>>,
  policySets: [] as Array<Record<string, unknown>>,
  nextPolicyId: 1,
  nextPaymentId: 1,
  nextAuditId: 1,
  failAudit: false,
  lockOk: true,
  lockAcquires: 0,
  lockReleases: 0,
  touched: [] as string[],
}));

const { validateStaffSession } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(),
}));

function clauseValues(clause: unknown): unknown[] {
  const values: unknown[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if ("value" in node && "encoder" in node) {
      values.push((node as { value: unknown }).value);
      return;
    }
    const chunks = (node as { queryChunks?: unknown[] }).queryChunks;
    if (Array.isArray(chunks)) chunks.forEach(visit);
  };
  visit(clause);
  return values;
}

function numericValues(values: unknown[]): number[] {
  return values.filter((value): value is number => typeof value === "number");
}

function takeSnapshot() {
  return {
    orders: new Map([...state.orders].map(([id, row]) => [id, { ...row }])),
    policies: state.policies.map((row) => ({ ...row })),
    payments: state.payments.map((row) => ({ ...row })),
    audits: state.audits.map((row) => ({ ...row })),
    nextPolicyId: state.nextPolicyId,
    nextPaymentId: state.nextPaymentId,
    nextAuditId: state.nextAuditId,
  };
}

function restore(snap: ReturnType<typeof takeSnapshot>) {
  state.orders = snap.orders;
  state.policies = snap.policies;
  state.payments = snap.payments;
  state.audits = snap.audits;
  state.nextPolicyId = snap.nextPolicyId;
  state.nextPaymentId = snap.nextPaymentId;
  state.nextAuditId = snap.nextAuditId;
}

function readRows(table: unknown, clause: unknown): Array<Record<string, unknown>> {
  const values = clauseValues(clause);
  if (table === schema.doorOrders) {
    const id = numericValues(values)[0];
    const row = state.orders.get(id);
    return row ? [row] : [];
  }
  if (table === schema.advancePolicies) {
    return state.policies.filter((row) => row.isCurrent === 1);
  }
  if (table === schema.orderPayments) {
    const orderId = numericValues(values)[0];
    return state.payments.filter((row) => row.doorOrderId === orderId);
  }
  if (table === schema.auditEvents) {
    const eventType = values.find((value) => typeof value === "string" && value.includes("."));
    const entityId = numericValues(values)[0];
    return state.audits.filter((row) => {
      if (entityId != null && row.entityId !== entityId) return false;
      if (eventType != null && row.eventType !== eventType) return false;
      return true;
    });
  }
  if (table === schema.adminSessions) {
    const token = values.find((value) => value === "legacy-admin");
    if (!token) return [];
    return [
      {
        id: 1,
        token: "legacy-admin",
        expiresAt: Date.now() + 60_000,
        createdAt: Date.now(),
      },
    ];
  }
  if (table === schema.inventoryItems || table === schema.inventoryTransactions) {
    throw new Error("advance flow touched inventory");
  }
  throw new Error("unexpected select");
}

function queryFrom(table: unknown) {
  state.touched.push(`select:${table === schema.doorOrders ? "door_orders" : "other"}`);
  return {
    where(clause: unknown) {
      const run = async () => readRows(table, clause);
      return {
        for(mode: string) {
          if (mode !== "update") throw new Error(`expected FOR UPDATE, got ${mode}`);
          return { limit: async (n: number) => (await run()).slice(0, n) };
        },
        limit: async (n: number) => (await run()).slice(0, n),
        then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
          return run().then(onFulfilled, onRejected);
        },
      };
    },
  };
}

function txApi() {
  return {
    select() {
      return { from: queryFrom };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return { where: async (clause: unknown) => applyUpdate(table, values, clause) };
        },
      };
    },
    insert(table: unknown) {
      return { values: async (row: Record<string, unknown>) => applyInsert(table, row) };
    },
    delete() {
      return { where: async () => undefined };
    },
    transaction,
  };
}

async function transaction(fn: (tx: ReturnType<typeof txApi>) => Promise<unknown>) {
  const snap = takeSnapshot();
  try {
    return await fn(txApi());
  } catch (error) {
    restore(snap);
    throw error;
  }
}

function applyUpdate(table: unknown, values: Record<string, unknown>, clause: unknown) {
  const id = numericValues(clauseValues(clause))[0];
  if (table === schema.doorOrders) {
    state.orderSets.push(values);
    const row = state.orders.get(id);
    if (!row) throw new Error("missing locked order");
    if ("canonicalNumber" in values) throw new Error("canonical number was updated");
    if ("acceptedTotalMinor" in values) row.acceptedTotalMinor = values.acceptedTotalMinor as bigint | null;
    if ("commercialStatus" in values) row.commercialStatus = String(values.commercialStatus);
    if ("materialState" in values) row.materialState = String(values.materialState);
    if ("paymentStatus" in values) row.paymentStatus = String(values.paymentStatus);
    if ("status" in values) row.status = String(values.status);
    if ("updatedAt" in values) row.updatedAt = Number(values.updatedAt);
    return;
  }
  if (table === schema.advancePolicies) {
    state.policySets.push(values);
    if ("requiredAdvanceBps" in values) {
      throw new Error("published advance basis points were updated");
    }
    const row = state.policies.find((policy) => policy.id === id);
    if (!row) throw new Error("missing policy");
    if ("isCurrent" in values) row.isCurrent = values.isCurrent as number | null;
    if ("supersededAt" in values) row.supersededAt = values.supersededAt as number | null;
    return;
  }
  if (table === schema.orderPayments) throw new Error("confirmed payment was updated");
  if (table === schema.inventoryItems || table === schema.inventoryTransactions) {
    throw new Error("advance flow touched inventory");
  }
  throw new Error("unexpected update");
}

function applyInsert(table: unknown, row: Record<string, unknown>) {
  if (table === schema.auditEvents) {
    if (state.failAudit) throw new Error("forced audit failure");
    const id = state.nextAuditId++;
    state.audits.push({ id, ...row });
    return { insertId: id };
  }
  if (table === schema.advancePolicies) {
    const id = state.nextPolicyId++;
    state.policies.push({
      id,
      requiredAdvanceBps: Number(row.requiredAdvanceBps),
      publishedByStaffUserId: Number(row.publishedByStaffUserId),
      publishedAt: Number(row.publishedAt),
      supersededAt: (row.supersededAt as number | null) ?? null,
      isCurrent: (row.isCurrent as number | null) ?? null,
    });
    return { insertId: id };
  }
  if (table === schema.orderPayments) {
    const id = state.nextPaymentId++;
    state.payments.push({
      id,
      doorOrderId: Number(row.doorOrderId),
      amountMinor: row.amountMinor as bigint,
      reference: (row.reference as string | null) ?? null,
      recordedByStaffUserId: Number(row.recordedByStaffUserId),
      receivedAt: Number(row.receivedAt),
      createdAt: Number(row.createdAt),
    });
    return { insertId: id };
  }
  if (table === schema.inventoryItems || table === schema.inventoryTransactions) {
    throw new Error("advance flow touched inventory");
  }
  throw new Error("unexpected insert");
}

vi.mock("./staff-sessions.js", async () => {
  const actual = await vi.importActual<typeof import("./staff-sessions.js")>("./staff-sessions.js");
  return { ...actual, validateStaffSession };
});

vi.mock("drizzle-orm/mysql2", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm/mysql2")>("drizzle-orm/mysql2");
  return {
    ...actual,
    drizzle: () => ({ transaction }),
  };
});

vi.mock("./db.js", async () => {
  const realSchema = await import("../drizzle/schema.js");
  return {
    schema: realSchema,
    db: txApi(),
    pool: {
      async getConnection() {
        return {
          async query(text: string) {
            if (text.includes("GET_LOCK")) {
              state.lockAcquires += 1;
              return [[{ locked: state.lockOk ? 1 : 0 }]];
            }
            if (text.includes("RELEASE_LOCK")) {
              state.lockReleases += 1;
              return [[{ released: 1 }]];
            }
            throw new Error(`unexpected connection query: ${text}`);
          },
          release() {},
          destroy() {},
        };
      },
    },
  };
});

import { appRouter } from "./routers.js";

function staff(roles: StaffRole[], userId = 42): StaffIdentity {
  return {
    userId,
    sessionId: 900,
    name: "موظف اختبار",
    loginName: "advance-test",
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

const sessions = new Map<string, StaffIdentity>();

function caller(identity: StaffIdentity | null, extra: Record<string, unknown> = {}) {
  const token = identity ? `staff-${identity.userId}-${identity.roles.join(".")}` : undefined;
  if (identity && token) sessions.set(token, identity);
  validateStaffSession.mockImplementation(async (presented: string | undefined) => {
    if (!presented) return null;
    return sessions.get(presented) ?? null;
  });
  return appRouter.createCaller({ staffToken: token, ...extra });
}

function seed(partial: Partial<OrderRow> = {}) {
  const id = partial.id ?? 7;
  state.orders.set(id, {
    id,
    canonicalNumber: partial.canonicalNumber === undefined ? "SD-2026-000007" : partial.canonicalNumber,
    commercialStatus: partial.commercialStatus === undefined ? "draft" : partial.commercialStatus,
    materialState: partial.materialState ?? "not_started",
    acceptedTotalMinor: partial.acceptedTotalMinor ?? null,
    paymentStatus: partial.paymentStatus ?? "unpaid",
    status: partial.status ?? "new",
    updatedAt: partial.updatedAt ?? 1,
    customerName: "عميل سري",
  });
}

beforeEach(() => {
  state.orders = new Map();
  state.policies = [];
  state.payments = [];
  state.audits = [];
  state.orderSets = [];
  state.policySets = [];
  state.nextPolicyId = 1;
  state.nextPaymentId = 1;
  state.nextAuditId = 1;
  state.failAudit = false;
  state.lockOk = true;
  state.lockAcquires = 0;
  state.lockReleases = 0;
  state.touched = [];
  sessions.clear();
  validateStaffSession.mockReset();
});

describe("advance basis point arithmetic", () => {
  it("rounds exact percentages without a remainder", () => {
    expect(requiredAdvanceMinor(10000n, 5000)).toBe(5000n);
    expect(requiredAdvanceMinor(10000n, 0)).toBe(0n);
    expect(requiredAdvanceMinor(10000n, 10000)).toBe(10000n);
  });

  it("rounds a remainder up to the next minor unit", () => {
    expect(requiredAdvanceMinor(10001n, 5000)).toBe(5001n);
    expect(requiredAdvanceMinor(1n, 1)).toBe(1n);
  });

  it("does not use floating-point rounding", () => {
    const accepted = 10000000000000001n;
    const exact = requiredAdvanceMinor(accepted, 1);
    expect(exact).toBe(1000000000001n);
    const floaty = Math.ceil(Number(accepted) / 10000);
    expect(floaty).not.toBe(Number(exact));
  });

  it("rejects overflow instead of wrapping", () => {
    expect(() => requiredAdvanceMinor(MAX_SIGNED_BIGINT + 1n, 1)).toThrow(AdvancePaymentError);
    expect(remainingAdvanceMinor(5n, 8n)).toBe(0n);
    expect(remainingAdvanceMinor(5n, 5n)).toBe(0n);
    expect(remainingAdvanceMinor(5n, 4n)).toBe(1n);
  });
});

describe("advance policy publication", () => {
  it("lets admin publish and records the session actor", async () => {
    const result = await caller(staff(["admin"], 77)).advance.publishPolicy({
      requiredAdvanceBps: 3000,
    });
    expect(result).toMatchObject({ policyId: 1, requiredAdvanceBps: 3000, previousPolicyId: null });
    expect(state.policies).toEqual([
      expect.objectContaining({
        id: 1,
        requiredAdvanceBps: 3000,
        publishedByStaffUserId: 77,
        isCurrent: 1,
        supersededAt: null,
      }),
    ]);
    expect(state.audits[0]).toMatchObject({
      eventType: ADVANCE_POLICY_PUBLISHED_EVENT,
      entityType: "advance_policy",
      entityId: 1,
      actorStaffUserId: 77,
      canonicalNumber: null,
      beforeJson: null,
      afterJson: { policyId: 1, requiredAdvanceBps: 3000, previousPolicyId: null },
    });
    expect(JSON.stringify(state.audits[0])).not.toContain("عميل");
    expect(state.lockAcquires).toBe(1);
    expect(state.lockReleases).toBe(1);
  });

  it("accepts 0 and 10000 basis points and rejects values outside that range", async () => {
    const admin = caller(staff(["admin"]));
    await expect(admin.advance.publishPolicy({ requiredAdvanceBps: 0 })).resolves.toMatchObject({
      requiredAdvanceBps: 0,
    });
    await expect(admin.advance.publishPolicy({ requiredAdvanceBps: 10000 })).resolves.toMatchObject({
      requiredAdvanceBps: 10000,
    });
    await expect(admin.advance.publishPolicy({ requiredAdvanceBps: -1 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(admin.advance.publishPolicy({ requiredAdvanceBps: 10001 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(admin.advance.publishPolicy({ requiredAdvanceBps: 10.5 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(state.policies.map((row) => row.requiredAdvanceBps)).toEqual([0, 10000]);
  });

  it("denies non-admin roles", async () => {
    for (const role of ["sales_coordinator", "sales_person", "stock_manager", "production_manager"] as const) {
      await expect(
        caller(staff([role])).advance.publishPolicy({ requiredAdvanceBps: 3000 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(state.policies).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
  });

  it("rejects a client-supplied actor, current flag, or version", async () => {
    await expect(
      caller(staff(["admin"], 77)).advance.publishPolicy({
        requiredAdvanceBps: 3000,
        publishedBy: 9,
        actorId: 9,
        isCurrent: 1,
        version: 4,
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.policies).toHaveLength(0);
  });

  it("keeps exactly one current policy and does not edit the old term", async () => {
    const admin = caller(staff(["admin"], 77));
    await admin.advance.publishPolicy({ requiredAdvanceBps: 3000 });
    await admin.advance.publishPolicy({ requiredAdvanceBps: 5000 });
    expect(state.policies.filter((row) => row.isCurrent === 1)).toHaveLength(1);
    expect(state.policies[0]).toMatchObject({
      requiredAdvanceBps: 3000,
      isCurrent: null,
      publishedByStaffUserId: 77,
    });
    expect(state.policies[0]?.supersededAt).toEqual(expect.any(Number));
    expect(state.policies[1]).toMatchObject({ requiredAdvanceBps: 5000, isCurrent: 1 });
    expect(state.policySets).toEqual([
      expect.objectContaining({ isCurrent: null }),
    ]);
    expect(state.policySets.every((set) => !("requiredAdvanceBps" in set))).toBe(true);
    expect(state.audits.map((row) => row.eventType)).toEqual([
      ADVANCE_POLICY_PUBLISHED_EVENT,
      ADVANCE_POLICY_PUBLISHED_EVENT,
    ]);
    expect(state.audits[1]?.afterJson).toMatchObject({
      requiredAdvanceBps: 5000,
      previousPolicyId: 1,
    });
  });

  it("rolls the policy back when the audit insert fails", async () => {
    state.failAudit = true;
    await expect(
      caller(staff(["admin"])).advance.publishPolicy({ requiredAdvanceBps: 3000 })
    ).rejects.toThrow("forced audit failure");
    expect(state.policies).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
    expect(state.lockReleases).toBe(1);
  });

  it("returns a clean conflict when the publish lock is not acquired", async () => {
    state.lockOk = false;
    await expect(
      caller(staff(["admin"])).advance.publishPolicy({ requiredAdvanceBps: 3000 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.policies).toHaveLength(0);
  });
});

describe("accepted total", () => {
  it("lets a sales coordinator set one positive minor total", async () => {
    seed();
    const result = await caller(staff(["sales_coordinator"], 42)).advance.setAcceptedTotal({
      orderId: 7,
      acceptedTotalMinor: 125000,
    });
    expect(result).toMatchObject({
      applied: true,
      orderId: 7,
      canonicalNumber: "SD-2026-000007",
      acceptedTotalMinor: "125000",
    });
    const order = state.orders.get(7)!;
    expect(order.acceptedTotalMinor).toBe(125000n);
    expect(order.commercialStatus).toBe("draft");
    expect(order.materialState).toBe("not_started");
    expect(order.canonicalNumber).toBe("SD-2026-000007");
    expect(order.paymentStatus).toBe("unpaid");
    expect(state.orderSets).toEqual([
      { acceptedTotalMinor: 125000n, updatedAt: expect.any(Number) },
    ]);
    expect(state.audits[0]).toMatchObject({
      eventType: ACCEPTED_TOTAL_SET_EVENT,
      entityType: "door_order",
      entityId: 7,
      canonicalNumber: "SD-2026-000007",
      actorStaffUserId: 42,
      beforeJson: { acceptedTotalMinor: null },
      afterJson: { acceptedTotalMinor: "125000" },
    });
    expect(typeof (state.audits[0]?.afterJson as { acceptedTotalMinor: unknown }).acceptedTotalMinor).toBe(
      "string"
    );
    expect(JSON.stringify(state.audits[0])).not.toContain("عميل سري");
  });

  it("lets admin act only when the sales coordinator role is also present", async () => {
    seed();
    await expect(
      caller(staff(["admin"])).advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 1000 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["sales_person"])).advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 1000 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["admin", "sales_coordinator"], 43)).advance.setAcceptedTotal({
        orderId: 7,
        acceptedTotalMinor: 1000,
      })
    ).resolves.toMatchObject({ applied: true, acceptedTotalMinor: "1000" });
    expect(state.audits[0]?.actorStaffUserId).toBe(43);
  });

  it("rejects zero, negative, and fractional amounts", async () => {
    seed();
    const coordinator = caller(staff(["sales_coordinator"]));
    await expect(
      coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 0 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: -5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 10.5 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: "10.50" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.orders.get(7)?.acceptedTotalMinor).toBeNull();
    expect(state.audits).toHaveLength(0);
  });

  it("rejects orders that are not on an open commercial lifecycle", async () => {
    const coordinator = caller(staff(["sales_coordinator"]));
    for (const partial of [
      { canonicalNumber: null },
      { commercialStatus: null },
      { commercialStatus: "rejected" },
      { commercialStatus: "cancelled" },
    ] as const) {
      state.orders.clear();
      state.audits = [];
      seed(partial);
      await expect(
        coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 1000 })
      ).rejects.toMatchObject({ code: "CONFLICT" });
    }
    expect(state.audits).toHaveLength(0);
  });

  it("allows the total only before material commitment", async () => {
    const coordinator = caller(staff(["sales_coordinator"]));
    for (const materialState of ["not_started", "pending_materials"] as const) {
      state.orders.clear();
      state.audits = [];
      seed({ materialState, commercialStatus: materialState === "pending_materials" ? "approved" : "draft" });
      await expect(
        coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 2000 })
      ).resolves.toMatchObject({ applied: true });
      expect(state.orders.get(7)?.materialState).toBe(materialState);
    }
    for (const materialState of ["partially_reserved", "fully_reserved", "released"] as const) {
      state.orders.clear();
      state.audits = [];
      seed({ materialState, commercialStatus: "approved" });
      await expect(
        coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 2000 })
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(state.orders.get(7)?.acceptedTotalMinor).toBeNull();
    }
  });

  it("is idempotent for the same audited value and conflicts on a different value", async () => {
    seed();
    const coordinator = caller(staff(["sales_coordinator"], 42));
    await coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: "125000" });
    await expect(
      coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 125000n })
    ).resolves.toMatchObject({ applied: false, acceptedTotalMinor: "125000" });
    expect(state.audits.filter((row) => row.eventType === ACCEPTED_TOTAL_SET_EVENT)).toHaveLength(1);
    await expect(
      coordinator.advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 125001 })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.orders.get(7)?.acceptedTotalMinor).toBe(125000n);
    expect(state.audits).toHaveLength(1);
  });

  it("conflicts when the same value has no matching audit", async () => {
    seed({ acceptedTotalMinor: 125000n });
    await expect(
      caller(staff(["sales_coordinator"])).advance.setAcceptedTotal({
        orderId: 7,
        acceptedTotalMinor: 125000,
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.audits).toHaveLength(0);
  });

  it("rolls the accepted total back when the audit insert fails", async () => {
    seed();
    state.failAudit = true;
    await expect(
      caller(staff(["sales_coordinator"])).advance.setAcceptedTotal({
        orderId: 7,
        acceptedTotalMinor: 125000,
      })
    ).rejects.toThrow("forced audit failure");
    expect(state.orders.get(7)?.acceptedTotalMinor).toBeNull();
    expect(state.audits).toHaveLength(0);
  });

  it("rejects a spoofed actor", async () => {
    seed();
    await expect(
      caller(staff(["sales_coordinator"], 42)).advance.setAcceptedTotal({
        orderId: 7,
        acceptedTotalMinor: 125000,
        actorStaffUserId: 999,
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.orders.get(7)?.acceptedTotalMinor).toBeNull();
  });
});

describe("confirmed payments", () => {
  it("lets a sales coordinator append a positive payment before approval", async () => {
    seed({ commercialStatus: "draft", paymentStatus: "unpaid" });
    const result = await caller(staff(["sales_coordinator"], 42)).advance.recordPayment({
      orderId: 7,
      amountMinor: 4000,
      reference: "  TRX-100  ",
    });
    expect(result).toMatchObject({
      paymentId: 1,
      orderId: 7,
      canonicalNumber: "SD-2026-000007",
      amountMinor: "4000",
    });
    expect(state.payments[0]).toMatchObject({
      amountMinor: 4000n,
      reference: "TRX-100",
      recordedByStaffUserId: 42,
    });
    expect(state.orders.get(7)).toMatchObject({
      commercialStatus: "draft",
      materialState: "not_started",
      canonicalNumber: "SD-2026-000007",
      paymentStatus: "unpaid",
      acceptedTotalMinor: null,
      updatedAt: 1,
    });
    expect(state.orderSets).toHaveLength(0);
    expect(state.audits[0]).toMatchObject({
      eventType: PAYMENT_RECORDED_EVENT,
      entityType: "door_order",
      entityId: 7,
      actorStaffUserId: 42,
      afterJson: { paymentId: 1, amountMinor: "4000" },
    });
    expect(JSON.stringify(state.audits[0])).not.toContain("TRX-100");
    expect(JSON.stringify(state.audits[0])).not.toContain("عميل سري");
  });

  it("denies every role except sales coordinator", async () => {
    seed();
    for (const role of ["admin", "sales_person", "stock_manager", "production_manager"] as const) {
      await expect(
        caller(staff([role])).advance.recordPayment({ orderId: 7, amountMinor: 100 })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await expect(
      caller(staff(["admin", "sales_coordinator"], 44)).advance.recordPayment({
        orderId: 7,
        amountMinor: 100,
      })
    ).resolves.toMatchObject({ amountMinor: "100" });
    expect(state.payments).toHaveLength(1);
    expect(state.audits[0]?.actorStaffUserId).toBe(44);
  });

  it("rejects zero, negative, and fractional payments", async () => {
    seed();
    const coordinator = caller(staff(["sales_coordinator"]));
    for (const amountMinor of [0, -1, 1.25, "1.25"]) {
      await expect(
        coordinator.advance.recordPayment({ orderId: 7, amountMinor })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(state.payments).toHaveLength(0);
  });

  it("rejects historical, rejected, and cancelled orders", async () => {
    const coordinator = caller(staff(["sales_coordinator"]));
    for (const partial of [
      { canonicalNumber: null },
      { commercialStatus: null },
      { commercialStatus: "rejected" },
      { commercialStatus: "cancelled" },
    ] as const) {
      state.orders.clear();
      seed(partial);
      await expect(
        coordinator.advance.recordPayment({ orderId: 7, amountMinor: 100 })
      ).rejects.toMatchObject({ code: "CONFLICT" });
    }
    expect(state.payments).toHaveLength(0);
  });

  it("appends payments without an update or delete path", async () => {
    seed({ commercialStatus: "coordinator_review", materialState: "partially_reserved" });
    const coordinator = caller(staff(["sales_coordinator"]));
    await coordinator.advance.recordPayment({ orderId: 7, amountMinor: 100 });
    await coordinator.advance.recordPayment({ orderId: 7, amountMinor: "250" });
    expect(state.payments.map((row) => row.amountMinor)).toEqual([100n, 250n]);
    expect(state.audits).toHaveLength(2);
    const source = readFileSync("server/advance-payment.ts", "utf8");
    expect(source).not.toContain("delete(schema.orderPayments)");
    expect(source).not.toContain("update(schema.orderPayments)");
    expect(source).not.toContain("paymentStatus");
    expect(source).not.toContain("inventoryItems");
    expect(source).not.toContain("currentQty");
  });

  it("rolls the payment back when the audit insert fails", async () => {
    seed();
    state.failAudit = true;
    await expect(
      caller(staff(["sales_coordinator"])).advance.recordPayment({ orderId: 7, amountMinor: 100 })
    ).rejects.toThrow("forced audit failure");
    expect(state.payments).toHaveLength(0);
    expect(state.audits).toHaveLength(0);
    expect(state.orders.get(7)?.paymentStatus).toBe("unpaid");
  });

  it("rejects a spoofed recorder", async () => {
    seed();
    await expect(
      caller(staff(["sales_coordinator"], 42)).advance.recordPayment({
        orderId: 7,
        amountMinor: 100,
        recordedByStaffUserId: 999,
        receivedAt: 1,
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.payments).toHaveLength(0);
  });
});

describe("advance eligibility", () => {
  async function publishAndAccept(bps: number, accepted: number | bigint | string) {
    await caller(staff(["admin"], 77)).advance.publishPolicy({ requiredAdvanceBps: bps });
    await caller(staff(["sales_coordinator"], 42)).advance.setAcceptedTotal({
      orderId: 7,
      acceptedTotalMinor: accepted,
    });
  }

  it("calculates 50 percent, one basis point, and a zero policy", async () => {
    seed();
    await publishAndAccept(5000, 10000);
    await expect(
      caller(staff(["sales_coordinator"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({
      eligible: true,
      reason: null,
      acceptedTotalMinor: "10000",
      requiredAdvanceBps: 5000,
      requiredAdvanceMinor: "5000",
      totalPaidMinor: "0",
      remainingAdvanceMinor: "5000",
      advanceSatisfied: false,
      fullyPaid: false,
    });

    state.orders.clear();
    state.policies = [];
    state.audits = [];
    state.nextPolicyId = 1;
    seed();
    await publishAndAccept(5000, 10001);
    await expect(
      caller(staff(["admin"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({ requiredAdvanceMinor: "5001", advanceSatisfied: false });

    state.orders.clear();
    state.policies = [];
    state.audits = [];
    state.nextPolicyId = 1;
    seed();
    await publishAndAccept(1, 1);
    await expect(
      caller(staff(["sales_coordinator"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({ requiredAdvanceMinor: "1", remainingAdvanceMinor: "1" });

    state.orders.clear();
    state.policies = [];
    state.audits = [];
    state.nextPolicyId = 1;
    seed();
    await publishAndAccept(0, 9000);
    await expect(
      caller(staff(["sales_coordinator"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({
      requiredAdvanceMinor: "0",
      remainingAdvanceMinor: "0",
      advanceSatisfied: true,
      fullyPaid: false,
    });
  });

  it("sums payments exactly and never returns a negative remainder", async () => {
    seed();
    await publishAndAccept(5000, 10000);
    const coordinator = caller(staff(["sales_coordinator"]));
    await coordinator.advance.recordPayment({ orderId: 7, amountMinor: 2000 });
    await coordinator.advance.recordPayment({ orderId: 7, amountMinor: 2999 });
    await expect(coordinator.advance.eligibility({ orderId: 7 })).resolves.toMatchObject({
      eligible: true,
      totalPaidMinor: "4999",
      requiredAdvanceMinor: "5000",
      remainingAdvanceMinor: "1",
      advanceSatisfied: false,
      fullyPaid: false,
    });
    await coordinator.advance.recordPayment({ orderId: 7, amountMinor: 1 });
    await expect(coordinator.advance.eligibility({ orderId: 7 })).resolves.toMatchObject({
      totalPaidMinor: "5000",
      remainingAdvanceMinor: "0",
      advanceSatisfied: true,
      fullyPaid: false,
    });
    await coordinator.advance.recordPayment({ orderId: 7, amountMinor: 6000 });
    await expect(coordinator.advance.eligibility({ orderId: 7 })).resolves.toMatchObject({
      totalPaidMinor: "11000",
      remainingAdvanceMinor: "0",
      advanceSatisfied: true,
      fullyPaid: true,
    });
  });

  it("fails closed without an accepted total or a current policy", async () => {
    seed();
    await caller(staff(["admin"])).advance.publishPolicy({ requiredAdvanceBps: 5000 });
    await expect(
      caller(staff(["sales_coordinator"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({
      eligible: false,
      reason: "missing_accepted_total",
      acceptedTotalMinor: null,
      requiredAdvanceMinor: null,
      requiredAdvanceBps: null,
      totalPaidMinor: "0",
      advanceSatisfied: false,
      fullyPaid: false,
    });

    state.policies = [];
    await caller(staff(["sales_coordinator"])).advance.setAcceptedTotal({
      orderId: 7,
      acceptedTotalMinor: 10000,
    });
    await expect(
      caller(staff(["admin"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({
      eligible: false,
      reason: "missing_advance_policy",
      acceptedTotalMinor: "10000",
      currentAdvancePolicyId: null,
      requiredAdvanceMinor: null,
      advanceSatisfied: false,
    });
    expect(
      (await caller(staff(["sales_coordinator"])).advance.eligibility({ orderId: 7 })).requiredAdvanceMinor
    ).not.toBe("0");
  });

  it("fails closed for historical orders and for an overflowing payment sum", async () => {
    seed({ canonicalNumber: null, commercialStatus: null });
    await expect(
      caller(staff(["admin"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({
      eligible: false,
      reason: "not_lifecycle_managed",
      requiredAdvanceMinor: null,
      totalPaidMinor: null,
      advanceSatisfied: false,
    });

    state.orders.clear();
    seed({ acceptedTotalMinor: 100n });
    state.policies.push({
      id: 1,
      requiredAdvanceBps: 5000,
      publishedByStaffUserId: 77,
      publishedAt: 1,
      supersededAt: null,
      isCurrent: 1,
    });
    state.payments.push(
      {
        id: 1,
        doorOrderId: 7,
        amountMinor: MAX_SIGNED_BIGINT,
        reference: null,
        recordedByStaffUserId: 42,
        receivedAt: 1,
        createdAt: 1,
      },
      {
        id: 2,
        doorOrderId: 7,
        amountMinor: 1n,
        reference: null,
        recordedByStaffUserId: 42,
        receivedAt: 1,
        createdAt: 1,
      }
    );
    await expect(
      caller(staff(["sales_coordinator"])).advance.eligibility({ orderId: 7 })
    ).resolves.toMatchObject({
      eligible: false,
      reason: "overflow",
      advanceSatisfied: false,
      requiredAdvanceMinor: null,
    });
  });

  it("does not expose eligibility to unrelated roles or anonymous callers", async () => {
    seed();
    await expect(caller(null).advance.eligibility({ orderId: 7 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      caller(staff(["sales_person"])).advance.eligibility({ orderId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["stock_manager"])).advance.eligibility({ orderId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("advance payment regression", () => {
  it("still approves an order that has no advance policy and no accepted total", async () => {
    seed({ commercialStatus: "admin_review", materialState: "not_started" });
    await expect(
      caller(staff(["admin"], 55)).orders.approve({
        orderId: 7,
        acceptedTotalMinor: 999999,
        advanceSatisfied: true,
      } as never)
    ).resolves.toMatchObject({
      applied: true,
      commercialStatus: "approved",
      materialState: "pending_materials",
      canonicalNumber: "SD-2026-000007",
    });
    expect(state.orders.get(7)?.acceptedTotalMinor).toBeNull();
    expect(state.policies).toHaveLength(0);
    expect(state.payments).toHaveLength(0);
    expect(state.audits[0]?.eventType).toBe("order.commercial.approved");
  });

  it("does not treat the legacy payment label as money or as the accepted total", async () => {
    seed({ commercialStatus: null, canonicalNumber: null });
    await expect(
      appRouter.createCaller({ adminToken: "legacy-admin" }).orders.updatePaymentStatus({
        id: 7,
        paymentStatus: "paid",
        acceptedTotalMinor: 5000,
        amountMinor: 5000,
      } as never)
    ).resolves.toEqual({ success: true });
    expect(state.orders.get(7)).toMatchObject({
      paymentStatus: "paid",
      acceptedTotalMinor: null,
    });
    expect(state.payments).toHaveLength(0);
    expect(state.policies).toHaveLength(0);
  });

  it("does not let factory order creation or the commercial machine set the accepted total", () => {
    const factory = readFileSync("server/factory-order-create.ts", "utf8");
    const commercial = readFileSync("server/commercial-order-lifecycle.ts", "utf8");
    expect(factory).not.toContain("acceptedTotalMinor");
    expect(commercial).not.toContain("acceptedTotalMinor");
    expect(commercial).not.toContain("orderPayments");
    expect(commercial).not.toContain("advancePolicies");
  });

  it("rejects anonymous and legacy-admin callers on the financial mutations", async () => {
    seed();
    await expect(
      caller(null).advance.publishPolicy({ requiredAdvanceBps: 1000 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller(null, { adminToken: "legacy-admin" }).advance.recordPayment({
        orderId: 7,
        amountMinor: 100,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller(null).advance.setAcceptedTotal({ orderId: 7, acceptedTotalMinor: 100 })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.policies).toHaveLength(0);
    expect(state.payments).toHaveLength(0);
    expect(state.orders.get(7)?.acceptedTotalMinor).toBeNull();
  });
});
