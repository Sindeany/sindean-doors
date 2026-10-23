import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";
import {
  AdvancePaymentError,
  requiredAdvanceMinor,
  type AdvanceTx,
} from "./advance-payment.js";
import { BOM_SNAPSHOT_CREATED_EVENT } from "./bom-rules.js";
import { db, pool } from "./db.js";

/**
 * Inventory reservation commits physical stock to an approved order.
 * It does not consume current_qty, post inventory transactions, or release material.
 *
 * v1 serializes reserveOrder, priority override, and stocktake reconciliation
 * with the named lock sindian_inventory_reservation_allocator. GET_LOCK, the
 * transaction, and RELEASE_LOCK share one physical connection. Ordinary consume
 * locks the item row and rejects a balance below reserved_qty. Cache mismatches
 * fail closed on reserve. Stocktake treats active reservation_lines as
 * authoritative and writes current_qty together with the repaired cache.
 */

export const RESERVATION_ALLOCATOR_LOCK = "sindian_inventory_reservation_allocator";
const LOCK_TIMEOUT_SECONDS = 15;

export const RESERVATION_ALLOCATED_EVENT = "order.reservation.allocated";
export const RESERVATION_REALLOCATED_EVENT = "order.reservation.reallocated";
export const RESERVATION_PRIORITY_EVENT = "order.reservation_priority.overridden";
export const RESERVATION_CACHE_REPAIRED_EVENT = "inventory.reservation_cache.repaired";

const RESERVABLE_MATERIAL_STATES = new Set([
  "pending_materials",
  "partially_reserved",
  "fully_reserved",
]);

export class ReservationError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST";

  constructor(code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST", message: string) {
    super(message);
    this.name = "ReservationError";
    this.code = code;
  }
}

export type ReservationTx = Pick<MySql2Database<typeof schema>, "insert" | "select" | "update">;

const RESERVABLE_MATERIAL_STATE_LIST = [
  "pending_materials",
  "partially_reserved",
  "fully_reserved",
] as const;

type ReservableMaterialState = (typeof RESERVABLE_MATERIAL_STATE_LIST)[number];

function isReservableMaterialState(value: string): value is ReservableMaterialState {
  return RESERVABLE_MATERIAL_STATES.has(value);
}

export type ShortageLine = {
  snapshotLineId: number;
  inventoryItemId: number;
  requiredQty: number;
  reservedQty: number;
  shortageQty: number;
  unit: string;
};

export type ReserveOrderResult = {
  applied: boolean;
  orderId: number;
  canonicalNumber: string;
  materialState: "pending_materials" | "partially_reserved" | "fully_reserved";
  reservationAdvancePolicyId: number | null;
  lines: ShortageLine[];
};

type SnapshotLine = {
  id: number;
  lineNumber: number;
  inventoryItemId: number;
  requiredQty: number;
  unit: string;
};

type ActiveLine = {
  id: number;
  doorOrderId: number;
  bomSnapshotLineId: number;
  inventoryItemId: number;
  reservedQty: number;
  status: string;
};

type DatabaseErrorPart = {
  errno: number | null;
  code: string;
  sqlState: string;
};

function databaseErrorParts(error: unknown): DatabaseErrorPart[] {
  const found: DatabaseErrorPart[] = [];
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as {
      errno?: unknown;
      code?: unknown;
      sqlState?: unknown;
      cause?: unknown;
    };
    found.push({
      errno: typeof record.errno === "number" ? record.errno : null,
      code: typeof record.code === "string" ? record.code : "",
      sqlState: typeof record.sqlState === "string" ? record.sqlState : "",
    });
    if ("cause" in record) queue.push(record.cause);
  }
  return found;
}

/** Maps reservation backstops to CONFLICT. Unexpected database failures pass through. */
export function conflictFromReservationDatabaseError(error: unknown): ReservationError | null {
  for (const part of databaseErrorParts(error)) {
    if (
      part.errno === 1062 ||
      part.errno === 1205 ||
      part.errno === 1213 ||
      part.errno === 1644 ||
      part.errno === 3819 ||
      part.sqlState === "45000" ||
      part.code === "ER_DUP_ENTRY" ||
      part.code === "ER_LOCK_WAIT_TIMEOUT" ||
      part.code === "ER_LOCK_DEADLOCK" ||
      part.code === "ER_SIGNAL_EXCEPTION" ||
      part.code === "ER_CHECK_CONSTRAINT_VIOLATED"
    ) {
      return new ReservationError("CONFLICT", "تعارض في حجز المخزون");
    }
  }
  return null;
}

function rethrowReservation(error: unknown): never {
  if (error instanceof ReservationError) throw error;
  if (error instanceof AdvancePaymentError) {
    throw new ReservationError("CONFLICT", "تعارض في حجز المخزون");
  }
  const conflict = conflictFromReservationDatabaseError(error);
  if (conflict) throw conflict;
  throw error;
}

function corruptOlder(): never {
  throw new ReservationError("CONFLICT", "حالة حجز طلب أقدم غير صالحة");
}

function requireActor(actorStaffUserId: number): void {
  if (!Number.isInteger(actorStaffUserId) || actorStaffUserId <= 0) {
    throw new ReservationError("CONFLICT", "هوية الموظف غير صالحة");
  }
}

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number } | undefined)?.insertId);
  return Number.isInteger(insertId) && insertId > 0 ? insertId : 0;
}

export function legalAllocation(physicalFree: number, olderUnmet: number, unmet: number): number {
  return Math.max(0, Math.min(unmet, physicalFree - olderUnmet));
}

export function deriveMaterialState(
  lines: Array<{ requiredQty: number; reservedQty: number }>
): "pending_materials" | "partially_reserved" | "fully_reserved" {
  if (lines.length === 0) return "pending_materials";
  const allFull = lines.every((line) => line.reservedQty === line.requiredQty);
  const allEmpty = lines.every((line) => line.reservedQty === 0);
  if (allFull) return "fully_reserved";
  if (allEmpty) return "pending_materials";
  return "partially_reserved";
}

export async function withReservationAllocator<T>(
  work: (connDb: MySql2Database<typeof schema>) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  let locked = false;
  try {
    const [rows] = await conn.query("SELECT GET_LOCK(?, ?) AS locked", [
      RESERVATION_ALLOCATOR_LOCK,
      LOCK_TIMEOUT_SECONDS,
    ]);
    locked = Number((rows as Array<{ locked?: number | string }>)[0]?.locked) === 1;
    if (!locked) throw new ReservationError("CONFLICT", "تعارض في حجز المخزون");
    const connDb = drizzle(conn, { schema, mode: "default" });
    return await work(connDb);
  } catch (error) {
    throw rethrowReservation(error);
  } finally {
    if (!locked) {
      conn.release();
    } else {
      try {
        const [rows] = await conn.query("SELECT RELEASE_LOCK(?) AS released", [
          RESERVATION_ALLOCATOR_LOCK,
        ]);
        if (Number((rows as Array<{ released?: unknown }>)[0]?.released) === 1) conn.release();
        else conn.destroy();
      } catch {
        conn.destroy();
      }
    }
  }
}

async function paidMinor(reader: AdvanceTx, orderId: number): Promise<bigint> {
  const rows = await reader
    .select({ amountMinor: schema.orderPayments.amountMinor })
    .from(schema.orderPayments)
    .where(eq(schema.orderPayments.doorOrderId, orderId));
  let total = 0n;
  for (const row of rows) {
    const amount = typeof row.amountMinor === "bigint" ? row.amountMinor : null;
    if (amount == null || amount <= 0n) {
      throw new ReservationError("CONFLICT", "دفعة غير صالحة");
    }
    total += amount;
  }
  return total;
}

async function policyBps(reader: AdvanceTx, policyId: number): Promise<number | null> {
  const [policy] = await reader
    .select({
      id: schema.advancePolicies.id,
      requiredAdvanceBps: schema.advancePolicies.requiredAdvanceBps,
    })
    .from(schema.advancePolicies)
    .where(eq(schema.advancePolicies.id, policyId))
    .limit(1);
  if (!policy) return null;
  if (!Number.isInteger(policy.requiredAdvanceBps) || policy.requiredAdvanceBps < 0 || policy.requiredAdvanceBps > 10000) {
    return null;
  }
  return policy.requiredAdvanceBps;
}

async function currentPolicy(reader: AdvanceTx): Promise<{ id: number; bps: number } | null> {
  const [policy] = await reader
    .select({
      id: schema.advancePolicies.id,
      requiredAdvanceBps: schema.advancePolicies.requiredAdvanceBps,
    })
    .from(schema.advancePolicies)
    .where(eq(schema.advancePolicies.isCurrent, 1))
    .limit(1);
  if (!policy) return null;
  if (!Number.isInteger(policy.requiredAdvanceBps) || policy.requiredAdvanceBps < 0 || policy.requiredAdvanceBps > 10000) {
    return null;
  }
  return { id: policy.id, bps: policy.requiredAdvanceBps };
}

function advanceMet(accepted: bigint, bps: number, paid: bigint): boolean {
  return paid >= requiredAdvanceMinor(accepted, bps);
}

async function orderAdvanceMet(
  reader: AdvanceTx,
  order: {
    id: number;
    acceptedTotalMinor: bigint | null;
    reservationAdvancePolicyId: number | null;
  },
  current: { id: number; bps: number } | null
): Promise<{ met: boolean; policyId: number | null }> {
  if (order.acceptedTotalMinor == null || order.acceptedTotalMinor <= 0n) {
    return { met: false, policyId: null };
  }
  const policyId = order.reservationAdvancePolicyId ?? current?.id ?? null;
  if (policyId == null) return { met: false, policyId: null };
  const bps =
    order.reservationAdvancePolicyId != null
      ? await policyBps(reader, order.reservationAdvancePolicyId)
      : current?.bps ?? null;
  if (bps == null) return { met: false, policyId };
  const paid = await paidMinor(reader, order.id);
  return { met: advanceMet(order.acceptedTotalMinor, bps, paid), policyId };
}

function snapshotAuditMatches(afterJson: unknown, snapshotId: number): boolean {
  const after = afterJson as { snapshotId?: unknown } | null;
  return after?.snapshotId === snapshotId;
}

async function loadLinesForItems(tx: ReservationTx, itemIds: number[]): Promise<ActiveLine[]> {
  if (itemIds.length === 0) return [];
  return tx
    .select({
      id: schema.reservationLines.id,
      doorOrderId: schema.reservationLines.doorOrderId,
      bomSnapshotLineId: schema.reservationLines.bomSnapshotLineId,
      inventoryItemId: schema.reservationLines.inventoryItemId,
      reservedQty: schema.reservationLines.reservedQty,
      status: schema.reservationLines.status,
    })
    .from(schema.reservationLines)
    .where(inArray(schema.reservationLines.inventoryItemId, itemIds));
}

export async function reserveOrder(
  actorStaffUserId: number,
  orderId: number,
  now = Date.now()
): Promise<ReserveOrderResult> {
  requireActor(actorStaffUserId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new ReservationError("BAD_REQUEST", "رقم الطلب غير صالح");
  }
  return withReservationAllocator((connDb) =>
    connDb.transaction((tx) => reserveOrderInTx(tx, actorStaffUserId, orderId, now))
  );
}

async function reserveOrderInTx(
  tx: ReservationTx,
  actorStaffUserId: number,
  orderId: number,
  now: number
): Promise<ReserveOrderResult> {
  const [order] = await tx
    .select({
      id: schema.doorOrders.id,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      commercialStatus: schema.doorOrders.commercialStatus,
      materialState: schema.doorOrders.materialState,
      priorityAt: schema.doorOrders.priorityAt,
      acceptedTotalMinor: schema.doorOrders.acceptedTotalMinor,
      reservationAdvancePolicyId: schema.doorOrders.reservationAdvancePolicyId,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .for("update")
    .limit(1);
  if (!order) throw new ReservationError("NOT_FOUND", "الطلب غير موجود");
  if (!order.canonicalNumber || order.commercialStatus == null) {
    throw new ReservationError("CONFLICT", "هذا الطلب ليس على دورة الاعتماد التجارية");
  }
  if (order.commercialStatus !== "approved") {
    throw new ReservationError("CONFLICT", "لا يمكن حجز المواد إلا لطلب معتمد");
  }
  if (!RESERVABLE_MATERIAL_STATES.has(order.materialState)) {
    throw new ReservationError("CONFLICT", "حالة المواد لا تسمح بالحجز");
  }
  if (order.priorityAt == null) {
    throw new ReservationError("CONFLICT", "الطلب بلا أولوية حجز");
  }
  const priorityAt = order.priorityAt;

  const [snapshot] = await tx
    .select({ id: schema.bomSnapshots.id })
    .from(schema.bomSnapshots)
    .where(eq(schema.bomSnapshots.doorOrderId, order.id))
    .for("update")
    .limit(1);
  if (!snapshot) throw new ReservationError("CONFLICT", "لا توجد لقطة مواد للطلب");
  const [audit] = await tx
    .select({ afterJson: schema.auditEvents.afterJson })
    .from(schema.auditEvents)
    .where(
      and(
        eq(schema.auditEvents.entityType, "door_order"),
        eq(schema.auditEvents.entityId, order.id),
        eq(schema.auditEvents.eventType, BOM_SNAPSHOT_CREATED_EVENT)
      )
    )
    .limit(1);
  if (!audit || !snapshotAuditMatches(audit.afterJson, snapshot.id)) {
    throw new ReservationError("CONFLICT", "لقطة المواد بلا سجل تدقيق مطابق");
  }

  const lines = await tx
    .select({
      id: schema.bomSnapshotLines.id,
      lineNumber: schema.bomSnapshotLines.lineNumber,
      inventoryItemId: schema.bomSnapshotLines.inventoryItemId,
      requiredQty: schema.bomSnapshotLines.requiredQty,
      unit: schema.bomSnapshotLines.unit,
    })
    .from(schema.bomSnapshotLines)
    .where(eq(schema.bomSnapshotLines.snapshotId, snapshot.id))
    .orderBy(asc(schema.bomSnapshotLines.lineNumber), asc(schema.bomSnapshotLines.id));
  if (lines.length === 0) throw new ReservationError("CONFLICT", "لقطة المواد بلا متطلبات");
  for (const line of lines) {
    if (!Number.isInteger(line.requiredQty) || line.requiredQty <= 0) {
      throw new ReservationError("CONFLICT", "كمية لقطة المواد غير صالحة");
    }
  }

  const itemIds = [...new Set(lines.map((line) => line.inventoryItemId))].sort((a, b) => a - b);
  const items = new Map<number, { id: number; unit: string; currentQty: number; reservedQty: number }>();
  for (const itemId of itemIds) {
    const [item] = await tx
      .select({
        id: schema.inventoryItems.id,
        unit: schema.inventoryItems.unit,
        currentQty: schema.inventoryItems.currentQty,
        reservedQty: schema.inventoryItems.reservedQty,
      })
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, itemId))
      .for("update")
      .limit(1);
    if (!item) throw new ReservationError("CONFLICT", "مادة اللقطة غير موجودة في المخزون");
    items.set(itemId, item);
  }
  for (const line of lines) {
    if (items.get(line.inventoryItemId)?.unit !== line.unit) {
      throw new ReservationError("CONFLICT", "وحدة لقطة المواد لا تطابق وحدة المخزون");
    }
  }

  const current = await currentPolicy(tx);
  const decision = await orderAdvanceMet(tx, order, current);
  if (!decision.met || decision.policyId == null) {
    throw new ReservationError("CONFLICT", "الدفعة المقدمة غير مكتملة");
  }

  const existingLines = await loadLinesForItems(tx, itemIds);
  const active = existingLines.filter((line) => line.status === "active");
  for (const itemId of itemIds) {
    const cache = items.get(itemId)!.reservedQty;
    const sum = active
      .filter((line) => line.inventoryItemId === itemId)
      .reduce((total, line) => total + line.reservedQty, 0);
    if (cache !== sum) throw new ReservationError("CONFLICT", "ذاكرة الحجز لا تطابق سطور الحجز");
  }

  const olderUnmet = await olderUnmetByItem(
    tx,
    { id: order.id, priorityAt },
    itemIds,
    items,
    current
  );
  const reservedByLine = new Map<number, ActiveLine>();
  for (const line of existingLines) {
    const prior = reservedByLine.get(line.bomSnapshotLineId);
    if (prior) throw new ReservationError("CONFLICT", "سجل الحجز مكرر لنفس بند اللقطة");
    reservedByLine.set(line.bomSnapshotLineId, line);
  }

  const beforeReserved = new Map<number, number>();
  for (const line of lines) {
    const existing = reservedByLine.get(line.id);
    beforeReserved.set(line.id, existing?.status === "active" ? existing.reservedQty : 0);
  }
  const deltas: Array<{ line: SnapshotLine; before: number; after: number }> = [];
  let allocated = 0;

  for (const line of lines) {
    const before = beforeReserved.get(line.id) ?? 0;
    const unmet = line.requiredQty - before;
    const item = items.get(line.inventoryItemId)!;
    const physicalFree = item.currentQty - item.reservedQty;
    const grant = legalAllocation(physicalFree, olderUnmet.get(line.inventoryItemId) ?? 0, Math.max(unmet, 0));
    if (grant <= 0) continue;
    const after = before + grant;
    if (after > line.requiredQty || after <= 0) {
      throw new ReservationError("CONFLICT", "الحجز يتجاوز احتياج اللقطة");
    }
    const existing = reservedByLine.get(line.id);
    if (existing && existing.doorOrderId !== order.id) {
      throw new ReservationError("CONFLICT", "بند اللقطة مرتبط بحجز طلب آخر");
    }
    if (existing?.status === "consumed") {
      throw new ReservationError("CONFLICT", "لا يمكن إعادة تفعيل حجز مستهلك");
    }
    if (existing?.status === "active" || existing?.status === "cancelled") {
      await tx
        .update(schema.reservationLines)
        .set({ reservedQty: after, updatedAt: now, status: "active" })
        .where(eq(schema.reservationLines.id, existing.id));
    } else if (!existing) {
      const inserted = await tx.insert(schema.reservationLines).values({
        doorOrderId: order.id,
        bomSnapshotLineId: line.id,
        inventoryItemId: line.inventoryItemId,
        reservedQty: after,
        status: "active",
        createdByStaffUserId: actorStaffUserId,
        createdAt: now,
        updatedAt: now,
      });
      if (insertIdOf(inserted) <= 0) throw new Error("reservation line id was not created");
    } else {
      throw new ReservationError("CONFLICT", "حالة سطر الحجز غير صالحة");
    }
    item.reservedQty += grant;
    await tx
      .update(schema.inventoryItems)
      .set({ reservedQty: item.reservedQty, updatedAt: now })
      .where(eq(schema.inventoryItems.id, item.id));
    allocated += grant;
    deltas.push({ line, before, after });
  }

  const reservedNow = new Map(beforeReserved);
  for (const delta of deltas) reservedNow.set(delta.line.id, delta.after);
  const summary = lines.map((line) => ({
    requiredQty: line.requiredQty,
    reservedQty: reservedNow.get(line.id) ?? 0,
  }));
  const materialState = deriveMaterialState(summary);
  let policyId = order.reservationAdvancePolicyId;
  if (allocated > 0 && policyId == null) {
    policyId = decision.policyId;
    await tx
      .update(schema.doorOrders)
      .set({ reservationAdvancePolicyId: policyId, materialState, updatedAt: now })
      .where(eq(schema.doorOrders.id, order.id));
  } else if (materialState !== order.materialState) {
    await tx
      .update(schema.doorOrders)
      .set({ materialState, updatedAt: now })
      .where(eq(schema.doorOrders.id, order.id));
  }

  const changed = allocated > 0 || materialState !== order.materialState;
  if (changed) {
    await tx.insert(schema.auditEvents).values({
      eventType: RESERVATION_ALLOCATED_EVENT,
      entityType: "door_order",
      entityId: order.id,
      canonicalNumber: order.canonicalNumber,
      actorStaffUserId,
      occurredAt: now,
      beforeJson: {
        snapshotId: snapshot.id,
        reservationAdvancePolicyId: order.reservationAdvancePolicyId,
        materialState: order.materialState,
        lines: deltas.map((delta) => ({
          snapshotLineId: delta.line.id,
          inventoryItemId: delta.line.inventoryItemId,
          reservedQty: delta.before,
        })),
      },
      afterJson: {
        snapshotId: snapshot.id,
        reservationAdvancePolicyId: policyId,
        materialState,
        lines: deltas.map((delta) => ({
          snapshotLineId: delta.line.id,
          inventoryItemId: delta.line.inventoryItemId,
          reservedQty: delta.after,
        })),
      },
    });
  }

  return {
    applied: changed,
    orderId: order.id,
    canonicalNumber: order.canonicalNumber,
    materialState,
    reservationAdvancePolicyId: policyId,
    lines: lines.map((line) => {
      const reservedQty = reservedNow.get(line.id) ?? 0;
      return {
        snapshotLineId: line.id,
        inventoryItemId: line.inventoryItemId,
        requiredQty: line.requiredQty,
        reservedQty,
        shortageQty: line.requiredQty - reservedQty,
        unit: line.unit,
      };
    }),
  };
}

type OlderCandidate = {
  id: number;
  priorityAt: number | null;
  materialState: string;
  acceptedTotalMinor: bigint | null;
  reservationAdvancePolicyId: number | null;
};

type OlderRequirement = {
  id: number;
  snapshotId: number;
  inventoryItemId: number;
  requiredQty: number;
  unit: string;
};

type OlderHistory = {
  id: number;
  doorOrderId: number;
  bomSnapshotLineId: number;
  inventoryItemId: number;
  reservedQty: number;
  status: string;
};

async function olderUnmetByItem(
  tx: ReservationTx,
  target: { id: number; priorityAt: number },
  itemIds: number[],
  items: Map<number, { unit: string }>,
  current: { id: number; bps: number } | null
): Promise<Map<number, number>> {
  const unmet = new Map<number, number>();
  const itemIdSet = new Set(itemIds);
  const older = await tx
    .select({
      id: schema.doorOrders.id,
      priorityAt: schema.doorOrders.priorityAt,
      materialState: schema.doorOrders.materialState,
      acceptedTotalMinor: schema.doorOrders.acceptedTotalMinor,
      reservationAdvancePolicyId: schema.doorOrders.reservationAdvancePolicyId,
      canonicalNumber: schema.doorOrders.canonicalNumber,
    })
    .from(schema.doorOrders)
    .where(
      and(
        eq(schema.doorOrders.commercialStatus, "approved"),
        sql`${schema.doorOrders.canonicalNumber} IS NOT NULL`,
        sql`${schema.doorOrders.priorityAt} IS NOT NULL`,
        inArray(schema.doorOrders.materialState, [...RESERVABLE_MATERIAL_STATE_LIST]),
        or(
          sql`${schema.doorOrders.priorityAt} < ${target.priorityAt}`,
          and(
            eq(schema.doorOrders.priorityAt, target.priorityAt),
            sql`${schema.doorOrders.id} < ${target.id}`
          )
        )
      )
    );
  if (older.length === 0) return unmet;
  const orderIds = older.map((row) => row.id);
  const snapshots = await tx
    .select({ id: schema.bomSnapshots.id, doorOrderId: schema.bomSnapshots.doorOrderId })
    .from(schema.bomSnapshots)
    .where(inArray(schema.bomSnapshots.doorOrderId, orderIds));
  const snapshotsByOrder = new Map<number, number[]>();
  for (const row of snapshots) {
    const list = snapshotsByOrder.get(row.doorOrderId) ?? [];
    list.push(row.id);
    snapshotsByOrder.set(row.doorOrderId, list);
  }
  const snapshotIds = snapshots.map((row) => row.id);
  const requirements = snapshotIds.length
    ? await tx
        .select({
          id: schema.bomSnapshotLines.id,
          snapshotId: schema.bomSnapshotLines.snapshotId,
          inventoryItemId: schema.bomSnapshotLines.inventoryItemId,
          requiredQty: schema.bomSnapshotLines.requiredQty,
          unit: schema.bomSnapshotLines.unit,
        })
        .from(schema.bomSnapshotLines)
        .where(inArray(schema.bomSnapshotLines.snapshotId, snapshotIds))
    : [];
  const linesBySnapshot = new Map<number, OlderRequirement[]>();
  for (const line of requirements) {
    const list = linesBySnapshot.get(line.snapshotId) ?? [];
    list.push(line);
    linesBySnapshot.set(line.snapshotId, list);
  }
  const history = await tx
    .select({
      id: schema.reservationLines.id,
      doorOrderId: schema.reservationLines.doorOrderId,
      bomSnapshotLineId: schema.reservationLines.bomSnapshotLineId,
      inventoryItemId: schema.reservationLines.inventoryItemId,
      reservedQty: schema.reservationLines.reservedQty,
      status: schema.reservationLines.status,
    })
    .from(schema.reservationLines)
    .where(inArray(schema.reservationLines.doorOrderId, orderIds));
  const historyByOrder = new Map<number, OlderHistory[]>();
  for (const row of history) {
    const list = historyByOrder.get(row.doorOrderId) ?? [];
    list.push(row);
    historyByOrder.set(row.doorOrderId, list);
  }
  const policyCache = new Map<number, number | null>();
  for (const candidate of older) {
    const gaps = await olderProtectedGaps(
      tx,
      candidate,
      itemIdSet,
      items,
      current,
      snapshotsByOrder.get(candidate.id) ?? [],
      linesBySnapshot,
      historyByOrder.get(candidate.id) ?? [],
      policyCache
    );
    if (!gaps) continue;
    for (const [itemId, qty] of gaps) {
      unmet.set(itemId, (unmet.get(itemId) ?? 0) + qty);
    }
  }
  return unmet;
}

async function olderProtectedGaps(
  tx: ReservationTx,
  candidate: OlderCandidate,
  itemIds: Set<number>,
  items: Map<number, { unit: string }>,
  current: { id: number; bps: number } | null,
  snapshotIds: number[],
  linesBySnapshot: Map<number, OlderRequirement[]>,
  history: OlderHistory[],
  policyCache: Map<number, number | null>
): Promise<Map<number, number> | null> {
  if (candidate.priorityAt == null || !isReservableMaterialState(candidate.materialState)) {
    corruptOlder();
  }
  if (snapshotIds.length > 1) corruptOlder();
  const snapshotId = snapshotIds[0] ?? null;
  if (snapshotId == null) {
    if (
      candidate.materialState !== "pending_materials" ||
      history.length > 0 ||
      candidate.reservationAdvancePolicyId != null
    ) {
      corruptOlder();
    }
    return null;
  }

  const [proof] = await tx
    .select({ afterJson: schema.auditEvents.afterJson })
    .from(schema.auditEvents)
    .where(
      and(
        eq(schema.auditEvents.entityType, "door_order"),
        eq(schema.auditEvents.entityId, candidate.id),
        eq(schema.auditEvents.eventType, BOM_SNAPSHOT_CREATED_EVENT)
      )
    )
    .limit(1);
  if (!proof || !snapshotAuditMatches(proof.afterJson, snapshotId)) corruptOlder();

  const snapshotLines = linesBySnapshot.get(snapshotId) ?? [];
  const lineById = new Map(snapshotLines.map((line) => [line.id, line]));
  const seenHistory = new Set<number>();
  const activeByLine = new Map<number, number>();
  for (const row of history) {
    if (seenHistory.has(row.bomSnapshotLineId)) corruptOlder();
    seenHistory.add(row.bomSnapshotLineId);
    const requirement = lineById.get(row.bomSnapshotLineId);
    if (!requirement || requirement.inventoryItemId !== row.inventoryItemId) corruptOlder();
    if (row.status === "consumed" || (row.status !== "active" && row.status !== "cancelled")) {
      corruptOlder();
    }
    if (!Number.isInteger(row.reservedQty) || row.reservedQty < 0) corruptOlder();
    if (row.status === "cancelled" && row.reservedQty !== 0) corruptOlder();
    if (row.status === "active") {
      if (row.reservedQty <= 0 || row.reservedQty > requirement.requiredQty) corruptOlder();
      activeByLine.set(row.bomSnapshotLineId, row.reservedQty);
    }
  }

  const relevant = snapshotLines.filter((line) => itemIds.has(line.inventoryItemId));
  for (const line of relevant) {
    if (!Number.isInteger(line.requiredQty) || line.requiredQty <= 0) corruptOlder();
    const item = items.get(line.inventoryItemId);
    if (!item || item.unit !== line.unit) corruptOlder();
    const reserved = activeByLine.get(line.id) ?? 0;
    if (reserved > line.requiredQty) corruptOlder();
  }
  if (relevant.length === 0) return null;

  if (candidate.acceptedTotalMinor == null) {
    if (
      history.length > 0 ||
      candidate.reservationAdvancePolicyId != null ||
      candidate.materialState !== "pending_materials"
    ) {
      corruptOlder();
    }
    return null;
  }
  if (candidate.acceptedTotalMinor <= 0n) corruptOlder();

  let bps: number | null;
  if (candidate.reservationAdvancePolicyId != null) {
    const policyId = candidate.reservationAdvancePolicyId;
    if (!policyCache.has(policyId)) policyCache.set(policyId, await policyBps(tx, policyId));
    bps = policyCache.get(policyId) ?? null;
    if (bps == null) corruptOlder();
  } else if (current == null) {
    corruptOlder();
  } else {
    bps = current.bps;
  }
  if (bps == null) corruptOlder();

  const paid = await paidMinor(tx, candidate.id);
  let met = false;
  try {
    met = advanceMet(candidate.acceptedTotalMinor, bps, paid);
  } catch (error) {
    if (error instanceof AdvancePaymentError) corruptOlder();
    throw error;
  }
  if (!met) return null;

  const gaps = new Map<number, number>();
  for (const line of relevant) {
    const reserved = activeByLine.get(line.id) ?? 0;
    const gap = line.requiredQty - reserved;
    if (gap > 0) gaps.set(line.inventoryItemId, (gaps.get(line.inventoryItemId) ?? 0) + gap);
  }
  return gaps;
}

export async function reservationStatus(orderId: number): Promise<ReserveOrderResult> {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new ReservationError("BAD_REQUEST", "رقم الطلب غير صالح");
  }
  const [order] = await db
    .select({
      id: schema.doorOrders.id,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      commercialStatus: schema.doorOrders.commercialStatus,
      materialState: schema.doorOrders.materialState,
      reservationAdvancePolicyId: schema.doorOrders.reservationAdvancePolicyId,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .limit(1);
  if (!order) throw new ReservationError("NOT_FOUND", "الطلب غير موجود");
  if (order.commercialStatus == null || !order.canonicalNumber) {
    throw new ReservationError("CONFLICT", "هذا الطلب ليس على دورة الاعتماد التجارية");
  }
  if (!isReservableMaterialState(order.materialState)) {
    throw new ReservationError("CONFLICT", "حالة المواد لا تسمح بالحجز");
  }
  const [snapshot] = await db
    .select({ id: schema.bomSnapshots.id })
    .from(schema.bomSnapshots)
    .where(eq(schema.bomSnapshots.doorOrderId, order.id))
    .limit(1);
  if (!snapshot) throw new ReservationError("CONFLICT", "لا توجد لقطة مواد للطلب");
  const lines = await db
    .select({
      id: schema.bomSnapshotLines.id,
      inventoryItemId: schema.bomSnapshotLines.inventoryItemId,
      requiredQty: schema.bomSnapshotLines.requiredQty,
      unit: schema.bomSnapshotLines.unit,
    })
    .from(schema.bomSnapshotLines)
    .where(eq(schema.bomSnapshotLines.snapshotId, snapshot.id))
    .orderBy(asc(schema.bomSnapshotLines.lineNumber), asc(schema.bomSnapshotLines.id));
  const active = lines.length
    ? await db
        .select({
          bomSnapshotLineId: schema.reservationLines.bomSnapshotLineId,
          reservedQty: schema.reservationLines.reservedQty,
        })
        .from(schema.reservationLines)
        .where(
          and(
            eq(schema.reservationLines.doorOrderId, order.id),
            eq(schema.reservationLines.status, "active")
          )
        )
    : [];
  const byLine = new Map(active.map((row) => [row.bomSnapshotLineId, row.reservedQty]));
  return {
    applied: false,
    orderId: order.id,
    canonicalNumber: order.canonicalNumber,
    materialState: order.materialState,
    reservationAdvancePolicyId: order.reservationAdvancePolicyId,
    lines: lines.map((line) => {
      const reservedQty = byLine.get(line.id) ?? 0;
      return {
        snapshotLineId: line.id,
        inventoryItemId: line.inventoryItemId,
        requiredQty: line.requiredQty,
        reservedQty,
        shortageQty: line.requiredQty - reservedQty,
        unit: line.unit,
      };
    }),
  };
}

export async function overrideReservationPriority(
  actorStaffUserId: number,
  orderId: number,
  priorityAt: number,
  now = Date.now()
): Promise<{ orderId: number; priorityAt: number }> {
  requireActor(actorStaffUserId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new ReservationError("BAD_REQUEST", "رقم الطلب غير صالح");
  }
  if (!Number.isInteger(priorityAt) || priorityAt <= 0) {
    throw new ReservationError("BAD_REQUEST", "أولوية الحجز غير صالحة");
  }
  return withReservationAllocator((connDb) =>
    connDb.transaction(async (tx) => {
      const [order] = await tx
        .select({
          id: schema.doorOrders.id,
          canonicalNumber: schema.doorOrders.canonicalNumber,
          commercialStatus: schema.doorOrders.commercialStatus,
          materialState: schema.doorOrders.materialState,
          priorityAt: schema.doorOrders.priorityAt,
          reservationAdvancePolicyId: schema.doorOrders.reservationAdvancePolicyId,
        })
        .from(schema.doorOrders)
        .where(eq(schema.doorOrders.id, orderId))
        .for("update")
        .limit(1);
      if (!order) throw new ReservationError("NOT_FOUND", "الطلب غير موجود");
      if (order.commercialStatus !== "approved" || order.materialState !== "pending_materials") {
        throw new ReservationError("CONFLICT", "لا يمكن تعديل الأولوية بعد بدء الحجز");
      }
      if (order.reservationAdvancePolicyId != null) {
        throw new ReservationError("CONFLICT", "لا يمكن تعديل الأولوية بعد التزام الحجز");
      }
      const [history] = await tx
        .select({ id: schema.reservationLines.id })
        .from(schema.reservationLines)
        .where(eq(schema.reservationLines.doorOrderId, order.id))
        .limit(1);
      if (history) throw new ReservationError("CONFLICT", "لا يمكن تعديل الأولوية بعد وجود سجل حجز");
      if (order.priorityAt === priorityAt) {
        return { orderId: order.id, priorityAt };
      }
      await tx
        .update(schema.doorOrders)
        .set({ priorityAt, updatedAt: now })
        .where(eq(schema.doorOrders.id, order.id));
      await tx.insert(schema.auditEvents).values({
        eventType: RESERVATION_PRIORITY_EVENT,
        entityType: "door_order",
        entityId: order.id,
        canonicalNumber: order.canonicalNumber,
        actorStaffUserId,
        occurredAt: now,
        beforeJson: { priorityAt: order.priorityAt },
        afterJson: { priorityAt },
      });
      return { orderId: order.id, priorityAt };
    })
  );
}

export type StocktakeReservationPlan = {
  finalReservedByItem: Map<number, number>;
};

type StocktakeLineDelta = {
  orderId: number;
  inventoryItemId: number;
  bomSnapshotLineId: number;
  reservationLineId: number;
  beforeReservedQty: number;
  afterReservedQty: number;
  beforeStatus: string;
  afterStatus: string;
};

/**
 * Plans the reservation rows for a stocktake. Does not write inventory_items.
 * The caller updates current_qty and reserved_qty together after this returns.
 */
export async function reconcileReservationsAfterStocktake(
  tx: ReservationTx,
  actorStaffUserId: number,
  counted: Map<number, number>,
  now: number
): Promise<StocktakeReservationPlan> {
  const countedItemIds = [...counted.keys()];
  const finalReservedByItem = new Map<number, number>();
  for (const itemId of countedItemIds) finalReservedByItem.set(itemId, 0);
  if (countedItemIds.length === 0) return { finalReservedByItem };

  const items = await tx
    .select({
      id: schema.inventoryItems.id,
      currentQty: schema.inventoryItems.currentQty,
      reservedQty: schema.inventoryItems.reservedQty,
    })
    .from(schema.inventoryItems)
    .where(inArray(schema.inventoryItems.id, countedItemIds));
  const active = await tx
    .select({
      id: schema.reservationLines.id,
      doorOrderId: schema.reservationLines.doorOrderId,
      bomSnapshotLineId: schema.reservationLines.bomSnapshotLineId,
      inventoryItemId: schema.reservationLines.inventoryItemId,
      reservedQty: schema.reservationLines.reservedQty,
      status: schema.reservationLines.status,
    })
    .from(schema.reservationLines)
    .where(
      and(
        inArray(schema.reservationLines.inventoryItemId, countedItemIds),
        eq(schema.reservationLines.status, "active")
      )
    );
  if (active.length === 0) {
    for (const item of items) {
      const beforeReserved = item.reservedQty ?? 0;
      if (beforeReserved !== 0) await auditReservationCacheRepair(tx, actorStaffUserId, item, 0, counted, now);
    }
    return { finalReservedByItem };
  }

  const orderIds = [...new Set(active.map((line) => line.doorOrderId))];
  const orders = await tx
    .select({
      id: schema.doorOrders.id,
      priorityAt: schema.doorOrders.priorityAt,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      materialState: schema.doorOrders.materialState,
    })
    .from(schema.doorOrders)
    .where(inArray(schema.doorOrders.id, orderIds));
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const lineMeta = await tx
    .select({
      id: schema.bomSnapshotLines.id,
      lineNumber: schema.bomSnapshotLines.lineNumber,
      snapshotId: schema.bomSnapshotLines.snapshotId,
      requiredQty: schema.bomSnapshotLines.requiredQty,
    })
    .from(schema.bomSnapshotLines)
    .where(inArray(schema.bomSnapshotLines.id, active.map((line) => line.bomSnapshotLineId)));
  const metaById = new Map(lineMeta.map((line) => [line.id, line]));
  const byItem = new Map<number, typeof active>();
  for (const line of active) {
    if (!orderById.has(line.doorOrderId) || !metaById.has(line.bomSnapshotLineId)) {
      throw new ReservationError("CONFLICT", "سطر حجز بلا طلب أو بند لقطة");
    }
    const list = byItem.get(line.inventoryItemId) ?? [];
    list.push(line);
    byItem.set(line.inventoryItemId, list);
  }
  const deltasByOrder = new Map<number, StocktakeLineDelta[]>();
  const mutatedItems = new Set<number>();
  for (const item of items) {
    const rows = (byItem.get(item.id) ?? []).slice().sort((left, right) => {
      const leftPriority = orderById.get(left.doorOrderId)?.priorityAt ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = orderById.get(right.doorOrderId)?.priorityAt ?? Number.MAX_SAFE_INTEGER;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      if (left.doorOrderId !== right.doorOrderId) return left.doorOrderId - right.doorOrderId;
      const leftLine = metaById.get(left.bomSnapshotLineId)?.lineNumber ?? 0;
      const rightLine = metaById.get(right.bomSnapshotLineId)?.lineNumber ?? 0;
      if (leftLine !== rightLine) return leftLine - rightLine;
      return left.bomSnapshotLineId - right.bomSnapshotLineId;
    });
    let remaining = counted.get(item.id) ?? item.currentQty;
    let activeSum = 0;
    for (const line of rows) {
      const keep = Math.max(0, Math.min(line.reservedQty, remaining));
      remaining -= keep;
      if (keep !== line.reservedQty) {
        const beforeReservedQty = line.reservedQty;
        const beforeStatus = line.status;
        const afterStatus = keep === 0 ? "cancelled" : "active";
        await tx
          .update(schema.reservationLines)
          .set({ reservedQty: keep, status: afterStatus, updatedAt: now })
          .where(eq(schema.reservationLines.id, line.id));
        const delta: StocktakeLineDelta = {
          orderId: line.doorOrderId,
          inventoryItemId: line.inventoryItemId,
          bomSnapshotLineId: line.bomSnapshotLineId,
          reservationLineId: line.id,
          beforeReservedQty,
          afterReservedQty: keep,
          beforeStatus,
          afterStatus,
        };
        const list = deltasByOrder.get(line.doorOrderId) ?? [];
        list.push(delta);
        deltasByOrder.set(line.doorOrderId, list);
        mutatedItems.add(item.id);
      }
      if (keep > 0) activeSum += keep;
    }
    finalReservedByItem.set(item.id, activeSum);
    if (!mutatedItems.has(item.id) && (item.reservedQty ?? 0) !== activeSum) {
      await auditReservationCacheRepair(tx, actorStaffUserId, item, activeSum, counted, now);
    }
  }
  for (const [orderId, deltas] of deltasByOrder) {
    const order = orderById.get(orderId);
    if (!order || deltas.length === 0) continue;
    const beforeState = order.materialState;
    const nextState = await recomputeOrderMaterialState(tx, orderId);
    if (nextState !== beforeState) {
      await tx
        .update(schema.doorOrders)
        .set({ materialState: nextState, updatedAt: now })
        .where(eq(schema.doorOrders.id, orderId));
    }
    const lines = deltas.map((delta) => ({
      inventoryItemId: delta.inventoryItemId,
      bomSnapshotLineId: delta.bomSnapshotLineId,
      reservationLineId: delta.reservationLineId,
      beforeReservedQty: delta.beforeReservedQty,
      afterReservedQty: delta.afterReservedQty,
      beforeStatus: delta.beforeStatus,
      afterStatus: delta.afterStatus,
    }));
    await tx.insert(schema.auditEvents).values({
      eventType: RESERVATION_REALLOCATED_EVENT,
      entityType: "door_order",
      entityId: orderId,
      canonicalNumber: order.canonicalNumber,
      actorStaffUserId,
      occurredAt: now,
      beforeJson: { reason: "stocktake", materialState: beforeState },
      afterJson: { reason: "stocktake", materialState: nextState, lines },
    });
  }
  return { finalReservedByItem };
}

async function auditReservationCacheRepair(
  tx: ReservationTx,
  actorStaffUserId: number,
  item: { id: number; currentQty: number; reservedQty: number | null },
  afterReservedQty: number,
  counted: Map<number, number>,
  now: number
): Promise<void> {
  await tx.insert(schema.auditEvents).values({
    eventType: RESERVATION_CACHE_REPAIRED_EVENT,
    entityType: "inventory_item",
    entityId: item.id,
    canonicalNumber: null,
    actorStaffUserId,
    occurredAt: now,
    beforeJson: {
      reason: "stocktake",
      inventoryItemId: item.id,
      reservedQty: item.reservedQty ?? 0,
      currentQty: item.currentQty,
    },
    afterJson: {
      reason: "stocktake",
      inventoryItemId: item.id,
      reservedQty: afterReservedQty,
      currentQty: counted.get(item.id) ?? item.currentQty,
    },
  });
}

async function recomputeOrderMaterialState(
  tx: ReservationTx,
  orderId: number
): Promise<"pending_materials" | "partially_reserved" | "fully_reserved"> {
  const [snapshot] = await tx
    .select({ id: schema.bomSnapshots.id })
    .from(schema.bomSnapshots)
    .where(eq(schema.bomSnapshots.doorOrderId, orderId))
    .limit(1);
  if (!snapshot) return "pending_materials";
  const lines = await tx
    .select({
      id: schema.bomSnapshotLines.id,
      requiredQty: schema.bomSnapshotLines.requiredQty,
    })
    .from(schema.bomSnapshotLines)
    .where(eq(schema.bomSnapshotLines.snapshotId, snapshot.id));
  const active = await tx
    .select({
      bomSnapshotLineId: schema.reservationLines.bomSnapshotLineId,
      reservedQty: schema.reservationLines.reservedQty,
    })
    .from(schema.reservationLines)
    .where(and(eq(schema.reservationLines.doorOrderId, orderId), eq(schema.reservationLines.status, "active")));
  const byLine = new Map(active.map((line) => [line.bomSnapshotLineId, line.reservedQty]));
  return deriveMaterialState(
    lines.map((line) => ({
      requiredQty: line.requiredQty,
      reservedQty: byLine.get(line.id) ?? 0,
    }))
  );
}

export async function orderHasReservationHistory(tx: ReservationTx, orderId: number): Promise<boolean> {
  const [row] = await tx
    .select({ id: schema.reservationLines.id })
    .from(schema.reservationLines)
    .where(eq(schema.reservationLines.doorOrderId, orderId))
    .limit(1);
  return Boolean(row);
}
