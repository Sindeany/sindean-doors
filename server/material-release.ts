import { and, asc, eq, inArray } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";
import { AdvancePaymentError, requiredAdvanceMinor } from "./advance-payment.js";
import { BOM_SNAPSHOT_CREATED_EVENT } from "./bom-rules.js";
import {
  ReservationError,
  conflictFromReservationDatabaseError,
  withReservationAllocator,
  type ReservationTx,
} from "./reservation.js";
import { db } from "./db.js";

/**
 * Material Release issues a fully reserved order's committed materials to production.
 * It is not Commercial Release. current_qty and reserved_qty fall by the same
 * issued quantity. Reservation rows stay, with status consumed and the issued
 * quantity preserved. The captured reservation advance policy is the only policy read.
 */

export const MATERIAL_RELEASE_COMPLETED_EVENT = "order.material_release.completed";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

export class MaterialReleaseError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST";

  constructor(code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST", message: string) {
    super(message);
    this.name = "MaterialReleaseError";
    this.code = code;
  }
}

export type MaterialReleaseActor = { userId: number; name: string };

export type MaterialReleaseLine = {
  reservationLineId: number;
  bomSnapshotLineId: number;
  inventoryItemId: number;
  issuedQty: number;
  unit: string;
  inventoryTransactionId: number;
};

export type MaterialReleaseResult = {
  applied: boolean;
  orderId: number;
  canonicalNumber: string;
  materialReleaseId: number;
  materialIssueId: number;
  bomSnapshotId: number;
  advancePolicyId: number;
  materialState: "released";
  commercialStatus: "approved";
  lines: MaterialReleaseLine[];
};

type ReleaseRow = {
  id: number;
  doorOrderId: number;
  bomSnapshotId: number;
  advancePolicyId: number;
  idempotencyKey: string;
};

function conflict(message: string): never {
  throw new MaterialReleaseError("CONFLICT", message);
}

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number } | undefined)?.insertId);
  return Number.isInteger(insertId) && insertId > 0 ? insertId : 0;
}

export function assertIdempotencyKey(value: string): string {
  const key = value.trim();
  if (!IDEMPOTENCY_KEY.test(key)) {
    throw new MaterialReleaseError("BAD_REQUEST", "مفتاح منع التكرار غير صالح");
  }
  return key;
}

function requireActor(actor: MaterialReleaseActor): void {
  if (!Number.isInteger(actor.userId) || actor.userId <= 0 || actor.name.trim().length === 0) {
    conflict("هوية الموظف غير صالحة");
  }
}

function snapshotAuditMatches(afterJson: unknown, snapshotId: number): boolean {
  const after = afterJson as { snapshotId?: unknown } | null;
  return after?.snapshotId === snapshotId;
}

function isoDate(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

async function paidMinor(tx: ReservationTx, orderId: number): Promise<bigint> {
  const rows = await tx
    .select({ amountMinor: schema.orderPayments.amountMinor })
    .from(schema.orderPayments)
    .where(eq(schema.orderPayments.doorOrderId, orderId));
  let total = 0n;
  for (const row of rows) {
    if (typeof row.amountMinor !== "bigint" || row.amountMinor <= 0n) conflict("دفعة غير صالحة");
    total += row.amountMinor;
  }
  return total;
}

async function releaseByOrder(tx: ReservationTx, orderId: number): Promise<ReleaseRow | null> {
  const [row] = await tx
    .select({
      id: schema.materialReleases.id,
      doorOrderId: schema.materialReleases.doorOrderId,
      bomSnapshotId: schema.materialReleases.bomSnapshotId,
      advancePolicyId: schema.materialReleases.advancePolicyId,
      idempotencyKey: schema.materialReleases.idempotencyKey,
    })
    .from(schema.materialReleases)
    .where(eq(schema.materialReleases.doorOrderId, orderId))
    .limit(1);
  return row ?? null;
}

async function releaseByKey(tx: ReservationTx, key: string): Promise<ReleaseRow | null> {
  const [row] = await tx
    .select({
      id: schema.materialReleases.id,
      doorOrderId: schema.materialReleases.doorOrderId,
      bomSnapshotId: schema.materialReleases.bomSnapshotId,
      advancePolicyId: schema.materialReleases.advancePolicyId,
      idempotencyKey: schema.materialReleases.idempotencyKey,
    })
    .from(schema.materialReleases)
    .where(eq(schema.materialReleases.idempotencyKey, key))
    .limit(1);
  return row ?? null;
}

async function completedLines(tx: ReservationTx, issueId: number): Promise<MaterialReleaseLine[]> {
  return tx
    .select({
      reservationLineId: schema.materialIssueLines.reservationLineId,
      bomSnapshotLineId: schema.materialIssueLines.bomSnapshotLineId,
      inventoryItemId: schema.materialIssueLines.inventoryItemId,
      issuedQty: schema.materialIssueLines.issuedQty,
      unit: schema.materialIssueLines.unit,
      inventoryTransactionId: schema.materialIssueLines.inventoryTransactionId,
    })
    .from(schema.materialIssueLines)
    .where(eq(schema.materialIssueLines.materialIssueId, issueId))
    .orderBy(asc(schema.materialIssueLines.id));
}

async function provenRelease(
  tx: ReservationTx,
  order: {
    id: number;
    canonicalNumber: string | null;
    commercialStatus: string | null;
    materialState: string;
    reservationAdvancePolicyId: number | null;
  },
  release: ReleaseRow
): Promise<MaterialReleaseResult> {
  if (
    order.commercialStatus !== "approved" ||
    order.materialState !== "released" ||
    !order.canonicalNumber ||
    order.reservationAdvancePolicyId == null ||
    order.reservationAdvancePolicyId !== release.advancePolicyId
  ) {
    conflict("سجل صرف المواد غير مكتمل");
  }
  const [snapshot] = await tx
    .select({ id: schema.bomSnapshots.id })
    .from(schema.bomSnapshots)
    .where(eq(schema.bomSnapshots.doorOrderId, order.id))
    .limit(1);
  if (!snapshot || snapshot.id !== release.bomSnapshotId) conflict("سجل صرف المواد غير مكتمل");
  const [issue] = await tx
    .select({ id: schema.materialIssues.id })
    .from(schema.materialIssues)
    .where(eq(schema.materialIssues.materialReleaseId, release.id))
    .limit(1);
  if (!issue) conflict("سجل صرف المواد غير مكتمل");
  const [audit] = await tx
    .select({ afterJson: schema.auditEvents.afterJson })
    .from(schema.auditEvents)
    .where(
      and(
        eq(schema.auditEvents.entityType, "door_order"),
        eq(schema.auditEvents.entityId, order.id),
        eq(schema.auditEvents.eventType, MATERIAL_RELEASE_COMPLETED_EVENT)
      )
    )
    .limit(1);
  const after = audit?.afterJson as { materialReleaseId?: unknown } | null;
  if (!audit || after?.materialReleaseId !== release.id) conflict("سجل صرف المواد غير مكتمل");
  const lines = await completedLines(tx, issue.id);
  const requirements = await tx
    .select({ id: schema.bomSnapshotLines.id, requiredQty: schema.bomSnapshotLines.requiredQty })
    .from(schema.bomSnapshotLines)
    .where(eq(schema.bomSnapshotLines.snapshotId, snapshot.id));
  const consumed = await tx
    .select({
      id: schema.reservationLines.id,
      bomSnapshotLineId: schema.reservationLines.bomSnapshotLineId,
      reservedQty: schema.reservationLines.reservedQty,
      status: schema.reservationLines.status,
    })
    .from(schema.reservationLines)
    .where(eq(schema.reservationLines.doorOrderId, order.id));
  if (lines.length !== requirements.length || consumed.length !== requirements.length) {
    conflict("سجل صرف المواد غير مكتمل");
  }
  const lineByReservation = new Map(lines.map((line) => [line.reservationLineId, line]));
  for (const requirement of requirements) {
    const row = consumed.find((item) => item.bomSnapshotLineId === requirement.id);
    const issued = row ? lineByReservation.get(row.id) : undefined;
    if (
      !row ||
      row.status !== "consumed" ||
      row.reservedQty !== requirement.requiredQty ||
      !issued ||
      issued.issuedQty !== requirement.requiredQty
    ) {
      conflict("سجل صرف المواد غير مكتمل");
    }
  }
  return {
    applied: false,
    orderId: order.id,
    canonicalNumber: order.canonicalNumber,
    materialReleaseId: release.id,
    materialIssueId: issue.id,
    bomSnapshotId: release.bomSnapshotId,
    advancePolicyId: release.advancePolicyId,
    materialState: "released",
    commercialStatus: "approved",
    lines,
  };
}

async function releaseInTx(
  tx: ReservationTx,
  actor: MaterialReleaseActor,
  orderId: number,
  idempotencyKey: string,
  now: number
): Promise<MaterialReleaseResult> {
  const [order] = await tx
    .select({
      id: schema.doorOrders.id,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      commercialStatus: schema.doorOrders.commercialStatus,
      materialState: schema.doorOrders.materialState,
      acceptedTotalMinor: schema.doorOrders.acceptedTotalMinor,
      reservationAdvancePolicyId: schema.doorOrders.reservationAdvancePolicyId,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .for("update")
    .limit(1);
  if (!order) throw new MaterialReleaseError("NOT_FOUND", "الطلب غير موجود");
  if (order.commercialStatus == null || !order.canonicalNumber) {
    conflict("هذا الطلب ليس على دورة الاعتماد التجارية");
  }

  const byKey = await releaseByKey(tx, idempotencyKey);
  const byOrder = await releaseByOrder(tx, order.id);
  if (byKey && byKey.doorOrderId !== order.id) conflict("مفتاح منع التكرار مستخدم لطلب آخر");
  if (byOrder && byOrder.idempotencyKey !== idempotencyKey) conflict("الطلب صُرف بمفتاح آخر");
  if (byOrder && byKey && byOrder.id === byKey.id) return provenRelease(tx, order, byOrder);
  if (order.materialState === "released" || byOrder || byKey) conflict("سجل صرف المواد غير مكتمل");
  if (order.commercialStatus !== "approved") conflict("لا يمكن صرف المواد إلا لطلب معتمد");
  if (order.materialState !== "fully_reserved") conflict("لا يمكن صرف المواد إلا بعد اكتمال الحجز");
  if (order.reservationAdvancePolicyId == null) conflict("لا توجد سياسة دفعة مقدمة مثبتة للحجز");
  if (order.acceptedTotalMinor == null || order.acceptedTotalMinor <= 0n) conflict("إجمالي القبول غير صالح");

  const [snapshot] = await tx
    .select({ id: schema.bomSnapshots.id })
    .from(schema.bomSnapshots)
    .where(eq(schema.bomSnapshots.doorOrderId, order.id))
    .for("update")
    .limit(1);
  if (!snapshot) conflict("لا توجد لقطة مواد للطلب");
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
    conflict("لقطة المواد بلا سجل تدقيق مطابق");
  }

  const requirements = await tx
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
  if (requirements.length === 0) conflict("لقطة المواد بلا متطلبات");

  const reservations = await tx
    .select({
      id: schema.reservationLines.id,
      bomSnapshotLineId: schema.reservationLines.bomSnapshotLineId,
      inventoryItemId: schema.reservationLines.inventoryItemId,
      reservedQty: schema.reservationLines.reservedQty,
      status: schema.reservationLines.status,
    })
    .from(schema.reservationLines)
    .where(eq(schema.reservationLines.doorOrderId, order.id))
    .orderBy(asc(schema.reservationLines.id))
    .for("update");
  if (reservations.length !== requirements.length) conflict("الحجز لا يطابق لقطة المواد");
  const reservationByLine = new Map(reservations.map((row) => [row.bomSnapshotLineId, row]));
  if (reservationByLine.size !== reservations.length) conflict("سجل الحجز مكرر لنفس بند اللقطة");

  const itemIds = [...new Set(requirements.map((line) => line.inventoryItemId))].sort((a, b) => a - b);
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
    if (!item) conflict("مادة اللقطة غير موجودة في المخزون");
    items.set(itemId, item);
  }

  for (const requirement of requirements) {
    if (!Number.isInteger(requirement.requiredQty) || requirement.requiredQty <= 0) {
      conflict("كمية لقطة المواد غير صالحة");
    }
    const reservation = reservationByLine.get(requirement.id);
    const item = items.get(requirement.inventoryItemId);
    if (!reservation || !item) conflict("بند اللقطة بلا حجز فعال");
    if (reservation.status !== "active") conflict("لا يمكن صرف حجز غير فعال");
    if (reservation.reservedQty !== requirement.requiredQty) conflict("كمية الحجز لا تطابق احتياج اللقطة");
    if (reservation.inventoryItemId !== requirement.inventoryItemId || item.unit !== requirement.unit) {
      conflict("بند الحجز لا يطابق لقطة المواد");
    }
  }

  const active = await tx
    .select({
      inventoryItemId: schema.reservationLines.inventoryItemId,
      reservedQty: schema.reservationLines.reservedQty,
      doorOrderId: schema.reservationLines.doorOrderId,
    })
    .from(schema.reservationLines)
    .where(
      and(inArray(schema.reservationLines.inventoryItemId, itemIds), eq(schema.reservationLines.status, "active"))
    );
  for (const itemId of itemIds) {
    const sum = active
      .filter((line) => line.inventoryItemId === itemId)
      .reduce((total, line) => total + line.reservedQty, 0);
    if (items.get(itemId)!.reservedQty !== sum) conflict("ذاكرة الحجز لا تطابق سطور الحجز");
  }

  const [policy] = await tx
    .select({ requiredAdvanceBps: schema.advancePolicies.requiredAdvanceBps })
    .from(schema.advancePolicies)
    .where(eq(schema.advancePolicies.id, order.reservationAdvancePolicyId))
    .limit(1);
  if (
    !policy ||
    !Number.isInteger(policy.requiredAdvanceBps) ||
    policy.requiredAdvanceBps < 0 ||
    policy.requiredAdvanceBps > 10000
  ) {
    conflict("سياسة الدفعة المقدمة المثبتة غير صالحة");
  }
  let required = 0n;
  try {
    required = requiredAdvanceMinor(order.acceptedTotalMinor, policy.requiredAdvanceBps);
  } catch (error) {
    if (error instanceof AdvancePaymentError) conflict("الدفعة المقدمة غير مكتملة");
    throw error;
  }
  if ((await paidMinor(tx, order.id)) < required) conflict("الدفعة المقدمة غير مكتملة");

  const releaseInsert = await tx.insert(schema.materialReleases).values({
    doorOrderId: order.id,
    bomSnapshotId: snapshot.id,
    advancePolicyId: order.reservationAdvancePolicyId,
    idempotencyKey,
    releasedByStaffUserId: actor.userId,
    releasedAt: now,
    createdAt: now,
  });
  const materialReleaseId = insertIdOf(releaseInsert);
  if (materialReleaseId <= 0) throw new Error("material release id was not created");
  const issueInsert = await tx.insert(schema.materialIssues).values({
    materialReleaseId,
    issuedByStaffUserId: actor.userId,
    issuedAt: now,
    createdAt: now,
  });
  const materialIssueId = insertIdOf(issueInsert);
  if (materialIssueId <= 0) throw new Error("material issue id was not created");

  const issuedByItem = new Map<number, number>();
  const lines: MaterialReleaseLine[] = [];
  const running = new Map(itemIds.map((id) => [id, items.get(id)!.currentQty]));
  for (const requirement of requirements) {
    const reservation = reservationByLine.get(requirement.id)!;
    const balanceBefore = running.get(requirement.inventoryItemId)!;
    const balanceAfter = balanceBefore - requirement.requiredQty;
    if (balanceAfter < 0) conflict("الكمية المتاحة في المخزون غير كافية");
    const txInsert = await tx.insert(schema.inventoryTransactions).values({
      itemId: requirement.inventoryItemId,
      type: "consume",
      quantity: requirement.requiredQty,
      balanceBefore,
      balanceAfter,
      reference: order.canonicalNumber,
      note: `material-release:${materialReleaseId}`,
      performedBy: actor.name.slice(0, 255),
      staffUserId: actor.userId,
      date: isoDate(now),
      createdAt: now,
    });
    const inventoryTransactionId = insertIdOf(txInsert);
    if (inventoryTransactionId <= 0) throw new Error("inventory transaction id was not created");
    const lineInsert = await tx.insert(schema.materialIssueLines).values({
      materialIssueId,
      reservationLineId: reservation.id,
      bomSnapshotLineId: requirement.id,
      inventoryItemId: requirement.inventoryItemId,
      issuedQty: requirement.requiredQty,
      unit: requirement.unit,
      inventoryTransactionId,
      createdAt: now,
    });
    if (insertIdOf(lineInsert) <= 0) throw new Error("material issue line id was not created");
    await tx
      .update(schema.reservationLines)
      .set({ status: "consumed", updatedAt: now })
      .where(eq(schema.reservationLines.id, reservation.id));
    running.set(requirement.inventoryItemId, balanceAfter);
    issuedByItem.set(
      requirement.inventoryItemId,
      (issuedByItem.get(requirement.inventoryItemId) ?? 0) + requirement.requiredQty
    );
    lines.push({
      reservationLineId: reservation.id,
      bomSnapshotLineId: requirement.id,
      inventoryItemId: requirement.inventoryItemId,
      issuedQty: requirement.requiredQty,
      unit: requirement.unit,
      inventoryTransactionId,
    });
  }

  for (const itemId of itemIds) {
    const item = items.get(itemId)!;
    const issueQty = issuedByItem.get(itemId) ?? 0;
    const currentQty = item.currentQty - issueQty;
    const reservedQty = item.reservedQty - issueQty;
    if (currentQty < 0 || reservedQty < 0 || reservedQty > currentQty) {
      conflict("تعارض في صرف المخزون");
    }
    await tx
      .update(schema.inventoryItems)
      .set({ currentQty, reservedQty, lastConsumed: isoDate(now), updatedAt: now })
      .where(eq(schema.inventoryItems.id, itemId));
  }

  await tx
    .update(schema.doorOrders)
    .set({ materialState: "released", updatedAt: now })
    .where(eq(schema.doorOrders.id, order.id));
  await tx.insert(schema.auditEvents).values({
    eventType: MATERIAL_RELEASE_COMPLETED_EVENT,
    entityType: "door_order",
    entityId: order.id,
    canonicalNumber: order.canonicalNumber,
    actorStaffUserId: actor.userId,
    occurredAt: now,
    beforeJson: { materialState: order.materialState },
    afterJson: {
      materialReleaseId,
      materialIssueId,
      bomSnapshotId: snapshot.id,
      advancePolicyId: order.reservationAdvancePolicyId,
      idempotencyKey,
      materialState: "released",
      lines,
    },
  });

  return {
    applied: true,
    orderId: order.id,
    canonicalNumber: order.canonicalNumber,
    materialReleaseId,
    materialIssueId,
    bomSnapshotId: snapshot.id,
    advancePolicyId: order.reservationAdvancePolicyId,
    materialState: "released",
    commercialStatus: "approved",
    lines,
  };
}

export async function releaseMaterials(
  actor: MaterialReleaseActor,
  orderId: number,
  idempotencyKeyInput: string,
  now = Date.now()
): Promise<MaterialReleaseResult> {
  requireActor(actor);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new MaterialReleaseError("BAD_REQUEST", "رقم الطلب غير صالح");
  }
  const idempotencyKey = assertIdempotencyKey(idempotencyKeyInput);
  try {
    return await withReservationAllocator((connDb) =>
      connDb.transaction((tx) => releaseInTx(tx, actor, orderId, idempotencyKey, now))
    );
  } catch (error) {
    if (error instanceof MaterialReleaseError) throw error;
    if (error instanceof ReservationError) {
      throw new MaterialReleaseError(error.code === "NOT_FOUND" ? "NOT_FOUND" : "CONFLICT", "تعارض في صرف المواد");
    }
    const dbConflict = conflictFromReservationDatabaseError(error);
    if (dbConflict) throw new MaterialReleaseError("CONFLICT", "تعارض في صرف المواد");
    throw error;
  }
}

export async function materialReleaseStatus(orderId: number): Promise<{
  released: boolean;
  orderId: number;
  canonicalNumber: string;
  materialState: string;
  commercialStatus: string;
  release: MaterialReleaseResult | null;
}> {
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new MaterialReleaseError("BAD_REQUEST", "رقم الطلب غير صالح");
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
  if (!order) throw new MaterialReleaseError("NOT_FOUND", "الطلب غير موجود");
  if (order.commercialStatus == null || !order.canonicalNumber) {
    conflict("هذا الطلب ليس على دورة الاعتماد التجارية");
  }
  const release = await releaseByOrder(db, order.id);
  if (order.materialState === "released" || release) {
    if (!release) conflict("سجل صرف المواد غير مكتمل");
    const proven = await provenRelease(db, order, release);
    return {
      released: true,
      orderId: order.id,
      canonicalNumber: order.canonicalNumber,
      materialState: order.materialState,
      commercialStatus: order.commercialStatus,
      release: proven,
    };
  }
  return {
    released: false,
    orderId: order.id,
    canonicalNumber: order.canonicalNumber,
    materialState: order.materialState,
    commercialStatus: order.commercialStatus,
    release: null,
  };
}
