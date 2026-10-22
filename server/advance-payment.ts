import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";
import { db, pool } from "./db.js";

/**
 * Advance-payment eligibility.
 *
 * Money is integer minor units (SAR halalas). Arithmetic uses BigInt.
 * accepted_total_minor is set once by a sales coordinator and is not derived
 * from legacy total_price. door_orders.payment_status is not payment evidence.
 *
 * Current policy: exactly one advance_policies row has is_current = 1.
 * Publication takes the connection-scoped lock `sindian_advance_policy_publish`
 * and holds it until after commit, same as staff bootstrap. Concurrent
 * publishers therefore serialize: both commit, and the later one is current.
 * UNIQUE(is_current) is the database backstop. A duplicate-key, deadlock, or
 * lock-wait timeout becomes CONFLICT rather than an internal error.
 * The lock is released on this connection after commit or rollback. If release
 * fails, the connection is destroyed so the pool cannot reuse a held lock.
 *
 * A repeated accepted-total command with the same minor value is idempotent
 * only when order.accepted_total.set already records that value. A different
 * value is CONFLICT. Confirmed payments are insert-only.
 *
 * Eligibility is derived. It does not approve, reserve, or release material.
 * Missing accepted total or missing current policy fails closed.
 */

export const ADVANCE_POLICY_LOCK = "sindian_advance_policy_publish";
const ADVANCE_POLICY_LOCK_TIMEOUT_SECONDS = 15;

export const ADVANCE_POLICY_PUBLISHED_EVENT = "advance.policy.published";
export const ACCEPTED_TOTAL_SET_EVENT = "order.accepted_total.set";
export const PAYMENT_RECORDED_EVENT = "order.payment.recorded";

/** Signed MySQL BIGINT upper bound. Values above this are rejected. */
export const MAX_SIGNED_BIGINT = 9223372036854775807n;
const BPS_DIVISOR = 10000n;

const ACCEPTED_TOTAL_MATERIAL_STATES = new Set(["not_started", "pending_materials"]);
const CLOSED_COMMERCIAL_STATUSES = new Set(["rejected", "cancelled"]);

export class AdvancePaymentError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST";

  constructor(code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST", message: string) {
    super(message);
    this.name = "AdvancePaymentError";
    this.code = code;
  }
}

export type AdvanceTx = Pick<
  MySql2Database<typeof schema>,
  "insert" | "select" | "update"
>;

export type AdvanceEligibilityReason =
  | "not_lifecycle_managed"
  | "missing_accepted_total"
  | "invalid_accepted_total"
  | "missing_advance_policy"
  | "invalid_advance_policy"
  | "overflow";

export type AdvanceEligibility = {
  eligible: boolean;
  reason: AdvanceEligibilityReason | null;
  acceptedTotalMinor: string | null;
  currentAdvancePolicyId: number | null;
  requiredAdvanceBps: number | null;
  requiredAdvanceMinor: string | null;
  totalPaidMinor: string | null;
  remainingAdvanceMinor: string | null;
  advanceSatisfied: boolean;
  fullyPaid: boolean;
};

type OrderMoneyRow = {
  id: number;
  canonicalNumber: string | null;
  commercialStatus: string | null;
  materialState: string | null;
  acceptedTotalMinor: bigint | null;
};

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number } | undefined)?.insertId);
  return Number.isInteger(insertId) && insertId > 0 ? insertId : 0;
}

function databaseErrorParts(error: unknown): Array<{ errno: number | null; code: string; message: string }> {
  const found: Array<{ errno: number | null; code: string; message: string }> = [];
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as { errno?: unknown; code?: unknown; message?: unknown; cause?: unknown };
    found.push({
      errno: typeof record.errno === "number" ? record.errno : null,
      code: typeof record.code === "string" ? record.code : "",
      message: typeof record.message === "string" ? record.message : "",
    });
    if ("cause" in record) queue.push(record.cause);
  }
  return found;
}

/** Maps expected InnoDB races to CONFLICT. Audit and validation errors pass through. */
export function conflictFromAdvanceDatabaseError(error: unknown): AdvancePaymentError | null {
  for (const part of databaseErrorParts(error)) {
    if (
      part.errno === 1062 ||
      part.errno === 1205 ||
      part.errno === 1213 ||
      part.code === "ER_DUP_ENTRY" ||
      part.code === "ER_LOCK_WAIT_TIMEOUT" ||
      part.code === "ER_LOCK_DEADLOCK" ||
      part.message.includes("Duplicate entry") ||
      part.message.includes("Lock wait timeout") ||
      part.message.includes("Deadlock found")
    ) {
      return new AdvancePaymentError("CONFLICT", "تعارض في عملية الدفعة المقدمة");
    }
  }
  return null;
}

function rethrowAdvance(error: unknown): never {
  if (error instanceof AdvancePaymentError) throw error;
  const conflict = conflictFromAdvanceDatabaseError(error);
  if (conflict) throw conflict;
  throw error;
}

function requireActor(actorStaffUserId: number): void {
  if (!Number.isInteger(actorStaffUserId) || actorStaffUserId <= 0) {
    throw new AdvancePaymentError("CONFLICT", "هوية الموظف غير صالحة");
  }
}

export function minorToString(value: bigint): string {
  return value.toString(10);
}

/** Exact non-negative integer. Unsafe JS numbers are rejected, not rounded. */
export function parseExactMinor(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) return null;
    return BigInt(value);
  }
  if (typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)) return BigInt(value);
  return null;
}

export function coercePositiveMinor(value: unknown): bigint {
  if (typeof value === "number" && !Number.isInteger(value)) {
    throw new AdvancePaymentError("BAD_REQUEST", "المبلغ يجب أن يكون عدداً صحيحاً بالهللة");
  }
  const parsed = parseExactMinor(value);
  if (parsed == null || parsed <= 0n || parsed > MAX_SIGNED_BIGINT) {
    throw new AdvancePaymentError("BAD_REQUEST", "المبلغ يجب أن يكون عدداً صحيحاً موجباً بالهللة");
  }
  return parsed;
}

export function assertAdvanceBps(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10000) {
    throw new AdvancePaymentError("BAD_REQUEST", "نسبة الدفعة المقدمة يجب أن تكون بين 0 و 10000 نقطة أساس");
  }
  return value;
}

/**
 * ceil(acceptedTotalMinor * bps / 10000) for non-negative integers.
 * The division never goes through a floating-point number.
 */
export function requiredAdvanceMinor(acceptedTotalMinor: bigint, requiredAdvanceBps: number): bigint {
  if (typeof acceptedTotalMinor !== "bigint") {
    throw new AdvancePaymentError("BAD_REQUEST", "إجمالي القبول غير صالح");
  }
  const bps = assertAdvanceBps(requiredAdvanceBps);
  if (acceptedTotalMinor < 0n || acceptedTotalMinor > MAX_SIGNED_BIGINT) {
    throw new AdvancePaymentError("BAD_REQUEST", "إجمالي القبول خارج النطاق المسموح");
  }
  const required = (acceptedTotalMinor * BigInt(bps) + BPS_DIVISOR - 1n) / BPS_DIVISOR;
  if (required > MAX_SIGNED_BIGINT) {
    throw new AdvancePaymentError("BAD_REQUEST", "الدفعة المقدمة المطلوبة تتجاوز النطاق المسموح");
  }
  return required;
}

export function remainingAdvanceMinor(required: bigint, paid: bigint): bigint {
  if (paid >= required) return 0n;
  return required - paid;
}

function normalizeReference(reference: string | null | undefined): string | null {
  if (reference == null) return null;
  if (typeof reference !== "string") {
    throw new AdvancePaymentError("BAD_REQUEST", "مرجع الدفعة غير صالح");
  }
  const trimmed = reference.trim();
  if (!trimmed) return null;
  if (trimmed.length > 128) {
    throw new AdvancePaymentError("BAD_REQUEST", "مرجع الدفعة أطول من الحد المسموح");
  }
  return trimmed;
}

function closedEligibility(
  reason: AdvanceEligibilityReason,
  partial: Partial<AdvanceEligibility> = {}
): AdvanceEligibility {
  return {
    eligible: false,
    reason,
    acceptedTotalMinor: partial.acceptedTotalMinor ?? null,
    currentAdvancePolicyId: partial.currentAdvancePolicyId ?? null,
    requiredAdvanceBps: partial.requiredAdvanceBps ?? null,
    requiredAdvanceMinor: null,
    totalPaidMinor: partial.totalPaidMinor ?? null,
    remainingAdvanceMinor: null,
    advanceSatisfied: false,
    fullyPaid: partial.fullyPaid ?? false,
  };
}

async function lockOrder(tx: AdvanceTx, orderId: number): Promise<OrderMoneyRow | null> {
  const [order] = await tx
    .select({
      id: schema.doorOrders.id,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      commercialStatus: schema.doorOrders.commercialStatus,
      materialState: schema.doorOrders.materialState,
      acceptedTotalMinor: schema.doorOrders.acceptedTotalMinor,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .for("update")
    .limit(1);
  return order ?? null;
}

function assertLifecycleOrder(order: OrderMoneyRow, blockedCommercial: boolean): void {
  if (!order.canonicalNumber || order.commercialStatus == null) {
    throw new AdvancePaymentError("CONFLICT", "هذا الطلب ليس على دورة الاعتماد التجارية");
  }
  if (blockedCommercial && CLOSED_COMMERCIAL_STATUSES.has(order.commercialStatus)) {
    throw new AdvancePaymentError("CONFLICT", "لا يمكن تنفيذ هذا الإجراء على طلب مرفوض أو ملغى");
  }
}

async function acceptedTotalAuditMatches(
  tx: AdvanceTx,
  orderId: number,
  acceptedTotalMinor: bigint
): Promise<boolean> {
  const [prior] = await tx
    .select({
      id: schema.auditEvents.id,
      afterJson: schema.auditEvents.afterJson,
    })
    .from(schema.auditEvents)
    .where(
      and(
        eq(schema.auditEvents.entityType, "door_order"),
        eq(schema.auditEvents.entityId, orderId),
        eq(schema.auditEvents.eventType, ACCEPTED_TOTAL_SET_EVENT)
      )
    )
    .for("update")
    .limit(1);
  if (!prior) return false;
  const after = prior.afterJson as { acceptedTotalMinor?: unknown } | null;
  return after?.acceptedTotalMinor === minorToString(acceptedTotalMinor);
}

async function publishAdvancePolicyInTx(
  tx: AdvanceTx,
  actorStaffUserId: number,
  requiredAdvanceBps: number,
  now: number
): Promise<{ policyId: number; requiredAdvanceBps: number; previousPolicyId: number | null }> {
  const [current] = await tx
    .select({
      id: schema.advancePolicies.id,
      requiredAdvanceBps: schema.advancePolicies.requiredAdvanceBps,
    })
    .from(schema.advancePolicies)
    .where(eq(schema.advancePolicies.isCurrent, 1))
    .for("update")
    .limit(1);

  if (current) {
    await tx
      .update(schema.advancePolicies)
      .set({ isCurrent: null, supersededAt: now })
      .where(eq(schema.advancePolicies.id, current.id));
  }

  const inserted = await tx.insert(schema.advancePolicies).values({
    requiredAdvanceBps,
    publishedByStaffUserId: actorStaffUserId,
    publishedAt: now,
    supersededAt: null,
    isCurrent: 1,
  });
  const policyId = insertIdOf(inserted);
  if (policyId <= 0) throw new Error("advance policy id was not created");

  await tx.insert(schema.auditEvents).values({
    eventType: ADVANCE_POLICY_PUBLISHED_EVENT,
    entityType: "advance_policy",
    entityId: policyId,
    canonicalNumber: null,
    actorStaffUserId,
    occurredAt: now,
    beforeJson: current ? { policyId: current.id } : null,
    afterJson: {
      policyId,
      requiredAdvanceBps,
      previousPolicyId: current?.id ?? null,
    },
  });

  return { policyId, requiredAdvanceBps, previousPolicyId: current?.id ?? null };
}

export async function publishAdvancePolicy(
  actorStaffUserId: number,
  requiredAdvanceBpsInput: unknown,
  now = Date.now()
): Promise<{ policyId: number; requiredAdvanceBps: number; previousPolicyId: number | null }> {
  requireActor(actorStaffUserId);
  const requiredAdvanceBps = assertAdvanceBps(requiredAdvanceBpsInput);
  const conn = await pool.getConnection();
  let locked = false;
  try {
    const [rows] = await conn.query("SELECT GET_LOCK(?, ?) AS locked", [
      ADVANCE_POLICY_LOCK,
      ADVANCE_POLICY_LOCK_TIMEOUT_SECONDS,
    ]);
    locked = Number((rows as Array<{ locked?: number | string }>)[0]?.locked) === 1;
    if (!locked) {
      throw new AdvancePaymentError("CONFLICT", "تعارض في نشر سياسة الدفعة المقدمة");
    }
    const txDb = drizzle(conn, { schema, mode: "default" });
    try {
      return await txDb.transaction((tx) =>
        publishAdvancePolicyInTx(tx, actorStaffUserId, requiredAdvanceBps, now)
      );
    } catch (error) {
      throw rethrowAdvance(error);
    }
  } finally {
    if (!locked) {
      conn.release();
    } else {
      try {
        const [rows] = await conn.query("SELECT RELEASE_LOCK(?) AS released", [ADVANCE_POLICY_LOCK]);
        const released = (rows as Array<{ released?: unknown }>)[0]?.released;
        if (Number(released) === 1) conn.release();
        else conn.destroy();
      } catch {
        conn.destroy();
      }
    }
  }
}

export async function setOrderAcceptedTotal(
  actorStaffUserId: number,
  orderId: number,
  acceptedTotalMinorInput: unknown,
  now = Date.now()
): Promise<{ applied: boolean; orderId: number; canonicalNumber: string; acceptedTotalMinor: string }> {
  requireActor(actorStaffUserId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new AdvancePaymentError("BAD_REQUEST", "رقم الطلب غير صالح");
  }
  const acceptedTotalMinor = coercePositiveMinor(acceptedTotalMinorInput);
  try {
    return await db.transaction(async (tx) => {
      const order = await lockOrder(tx, orderId);
      if (!order) throw new AdvancePaymentError("NOT_FOUND", "الطلب غير موجود");
      assertLifecycleOrder(order, true);
      if (!ACCEPTED_TOTAL_MATERIAL_STATES.has(order.materialState ?? "")) {
        throw new AdvancePaymentError("CONFLICT", "لا يمكن تحديد إجمالي القبول بعد بدء حجز المواد");
      }
      if (order.acceptedTotalMinor != null) {
        const current = parseExactMinor(order.acceptedTotalMinor);
        if (current == null || current !== acceptedTotalMinor) {
          throw new AdvancePaymentError("CONFLICT", "إجمالي القبول محدد مسبقاً ولا يتغير");
        }
        const proven = await acceptedTotalAuditMatches(tx, order.id, acceptedTotalMinor);
        if (!proven) {
          throw new AdvancePaymentError("CONFLICT", "إجمالي القبول بلا سجل تدقيق مطابق");
        }
        return {
          applied: false,
          orderId: order.id,
          canonicalNumber: order.canonicalNumber as string,
          acceptedTotalMinor: minorToString(acceptedTotalMinor),
        };
      }

      await tx
        .update(schema.doorOrders)
        .set({ acceptedTotalMinor, updatedAt: now })
        .where(eq(schema.doorOrders.id, order.id));
      await tx.insert(schema.auditEvents).values({
        eventType: ACCEPTED_TOTAL_SET_EVENT,
        entityType: "door_order",
        entityId: order.id,
        canonicalNumber: order.canonicalNumber,
        actorStaffUserId,
        occurredAt: now,
        beforeJson: { acceptedTotalMinor: null },
        afterJson: { acceptedTotalMinor: minorToString(acceptedTotalMinor) },
      });
      return {
        applied: true,
        orderId: order.id,
        canonicalNumber: order.canonicalNumber as string,
        acceptedTotalMinor: minorToString(acceptedTotalMinor),
      };
    });
  } catch (error) {
    rethrowAdvance(error);
  }
}

export async function recordConfirmedPayment(
  actorStaffUserId: number,
  orderId: number,
  amountMinorInput: unknown,
  referenceInput: string | null | undefined,
  now = Date.now()
): Promise<{ paymentId: number; orderId: number; canonicalNumber: string; amountMinor: string }> {
  requireActor(actorStaffUserId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new AdvancePaymentError("BAD_REQUEST", "رقم الطلب غير صالح");
  }
  const amountMinor = coercePositiveMinor(amountMinorInput);
  const reference = normalizeReference(referenceInput);
  try {
    return await db.transaction(async (tx) => {
      const order = await lockOrder(tx, orderId);
      if (!order) throw new AdvancePaymentError("NOT_FOUND", "الطلب غير موجود");
      assertLifecycleOrder(order, true);
      const inserted = await tx.insert(schema.orderPayments).values({
        doorOrderId: order.id,
        amountMinor,
        reference,
        recordedByStaffUserId: actorStaffUserId,
        receivedAt: now,
        createdAt: now,
      });
      const paymentId = insertIdOf(inserted);
      if (paymentId <= 0) throw new Error("order payment id was not created");
      await tx.insert(schema.auditEvents).values({
        eventType: PAYMENT_RECORDED_EVENT,
        entityType: "door_order",
        entityId: order.id,
        canonicalNumber: order.canonicalNumber,
        actorStaffUserId,
        occurredAt: now,
        beforeJson: null,
        afterJson: { paymentId, amountMinor: minorToString(amountMinor) },
      });
      return {
        paymentId,
        orderId: order.id,
        canonicalNumber: order.canonicalNumber as string,
        amountMinor: minorToString(amountMinor),
      };
    });
  } catch (error) {
    rethrowAdvance(error);
  }
}

async function sumConfirmedPayments(reader: AdvanceTx, orderId: number): Promise<bigint | null> {
  const rows = await reader
    .select({ amountMinor: schema.orderPayments.amountMinor })
    .from(schema.orderPayments)
    .where(eq(schema.orderPayments.doorOrderId, orderId));
  let total = 0n;
  for (const row of rows) {
    const amount = parseExactMinor(row.amountMinor);
    if (amount == null || amount <= 0n) return null;
    total += amount;
    if (total > MAX_SIGNED_BIGINT) return null;
  }
  return total;
}

export async function readAdvanceEligibility(
  reader: AdvanceTx,
  orderId: number
): Promise<AdvanceEligibility> {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new AdvancePaymentError("BAD_REQUEST", "رقم الطلب غير صالح");
  }
  const [order] = await reader
    .select({
      id: schema.doorOrders.id,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      commercialStatus: schema.doorOrders.commercialStatus,
      materialState: schema.doorOrders.materialState,
      acceptedTotalMinor: schema.doorOrders.acceptedTotalMinor,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .limit(1);
  if (!order) throw new AdvancePaymentError("NOT_FOUND", "الطلب غير موجود");
  if (!order.canonicalNumber || order.commercialStatus == null) {
    return closedEligibility("not_lifecycle_managed");
  }

  const totalPaid = await sumConfirmedPayments(reader, order.id);
  if (totalPaid == null) return closedEligibility("overflow");
  const totalPaidMinor = minorToString(totalPaid);

  const [policy] = await reader
    .select({
      id: schema.advancePolicies.id,
      requiredAdvanceBps: schema.advancePolicies.requiredAdvanceBps,
    })
    .from(schema.advancePolicies)
    .where(eq(schema.advancePolicies.isCurrent, 1))
    .limit(1);

  if (order.acceptedTotalMinor == null) {
    return closedEligibility("missing_accepted_total", {
      currentAdvancePolicyId: policy?.id ?? null,
      totalPaidMinor,
    });
  }
  const accepted = parseExactMinor(order.acceptedTotalMinor);
  if (accepted == null || accepted <= 0n || accepted > MAX_SIGNED_BIGINT) {
    return closedEligibility("invalid_accepted_total", {
      currentAdvancePolicyId: policy?.id ?? null,
      totalPaidMinor,
    });
  }
  const acceptedTotalMinor = minorToString(accepted);
  const fullyPaid = totalPaid >= accepted;

  if (!policy) {
    return closedEligibility("missing_advance_policy", {
      acceptedTotalMinor,
      totalPaidMinor,
      fullyPaid,
    });
  }
  if (!Number.isInteger(policy.requiredAdvanceBps) || policy.requiredAdvanceBps < 0 || policy.requiredAdvanceBps > 10000) {
    return closedEligibility("invalid_advance_policy", {
      acceptedTotalMinor,
      currentAdvancePolicyId: policy.id,
      totalPaidMinor,
      fullyPaid,
    });
  }

  let required: bigint;
  try {
    required = requiredAdvanceMinor(accepted, policy.requiredAdvanceBps);
  } catch (error) {
    if (error instanceof AdvancePaymentError) {
      return closedEligibility("overflow", {
        acceptedTotalMinor,
        currentAdvancePolicyId: policy.id,
        requiredAdvanceBps: policy.requiredAdvanceBps,
        totalPaidMinor,
        fullyPaid,
      });
    }
    throw error;
  }

  const remaining = remainingAdvanceMinor(required, totalPaid);
  return {
    eligible: true,
    reason: null,
    acceptedTotalMinor,
    currentAdvancePolicyId: policy.id,
    requiredAdvanceBps: policy.requiredAdvanceBps,
    requiredAdvanceMinor: minorToString(required),
    totalPaidMinor,
    remainingAdvanceMinor: minorToString(remaining),
    advanceSatisfied: totalPaid >= required,
    fullyPaid,
  };
}
