import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";
import { orderHasReservationHistory } from "./reservation.js";

/**
 * Commercial transitions lock the existing order first, then append one audit row.
 * They do not lock order_number_counters or inventory. Approval, BOM snapshot,
 * reservation, and Material Release can keep that order-first lock order.
 * This module must never allocate a canonical number.
 */
export const COMMERCIAL_LOCK_ORDER = ["door_orders.id", "audit_events.insert"] as const;

export const COMMERCIAL_STATUSES = [
  "draft",
  "coordinator_review",
  "admin_review",
  "approved",
  "rejected",
  "cancelled",
] as const;

export const MATERIAL_STATES = [
  "not_started",
  "pending_materials",
  "partially_reserved",
  "fully_reserved",
  "released",
] as const;

export type CommercialStatus = (typeof COMMERCIAL_STATUSES)[number];
export type MaterialState = (typeof MATERIAL_STATES)[number];

export const COMMERCIAL_COMMANDS = [
  "submit_for_coordinator_review",
  "submit_for_admin_review",
  "approve",
  "reject",
  "cancel",
] as const;

export type CommercialCommand = (typeof COMMERCIAL_COMMANDS)[number];

const BLOCKED_CANCEL_MATERIAL_STATES = [
  "partially_reserved",
  "fully_reserved",
  "released",
] as const satisfies readonly MaterialState[];

type OrderTx = Pick<
  MySql2Database<typeof schema>,
  "insert" | "select" | "update" | "delete"
>;

type Transition = {
  from: CommercialStatus;
  to: CommercialStatus;
  eventType: string;
};

const TRANSITIONS: Record<CommercialCommand, Transition> = {
  submit_for_coordinator_review: {
    from: "draft",
    to: "coordinator_review",
    eventType: "order.commercial.submitted_for_coordinator_review",
  },
  submit_for_admin_review: {
    from: "coordinator_review",
    to: "admin_review",
    eventType: "order.commercial.submitted_for_admin_review",
  },
  approve: {
    from: "admin_review",
    to: "approved",
    eventType: "order.commercial.approved",
  },
  reject: {
    from: "admin_review",
    to: "rejected",
    eventType: "order.commercial.rejected",
  },
  cancel: {
    from: "approved",
    to: "cancelled",
    eventType: "order.commercial.cancelled",
  },
};

export class CommercialOrderError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT";

  constructor(code: "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "CommercialOrderError";
    this.code = code;
  }
}

export type CommercialSnapshot = {
  commercialStatus: CommercialStatus;
  materialState: MaterialState;
};

export type CommercialCommandResult = {
  applied: boolean;
  orderId: number;
  canonicalNumber: string | null;
  commercialStatus: CommercialStatus;
  materialState: MaterialState;
};

function isCommercialStatus(value: string | null): value is CommercialStatus {
  return COMMERCIAL_STATUSES.some((status) => status === value);
}

function isMaterialState(value: string | null): value is MaterialState {
  return MATERIAL_STATES.some((state) => state === value);
}

function nextMaterialState(
  command: CommercialCommand,
  current: MaterialState
): MaterialState {
  if (command === "approve") return "pending_materials";
  if (command === "cancel" && current === "pending_materials") return "not_started";
  return current;
}

/**
 * Applies one commercial command inside the caller's transaction.
 * The caller must hold this transaction open across the lock, update, and audit insert.
 * `actorStaffUserId` is the authenticated staff user, never a client field.
 */
export async function applyCommercialCommand(
  tx: OrderTx,
  command: CommercialCommand,
  orderId: number,
  actorStaffUserId: number,
  now = Date.now()
): Promise<CommercialCommandResult> {
  if (!Number.isInteger(actorStaffUserId) || actorStaffUserId <= 0) {
    throw new CommercialOrderError("CONFLICT", "هوية الموظف غير صالحة");
  }
  const transition = TRANSITIONS[command];
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

  if (!order) {
    throw new CommercialOrderError("NOT_FOUND", "الطلب غير موجود");
  }
  if (!isCommercialStatus(order.commercialStatus)) {
    throw new CommercialOrderError(
      "CONFLICT",
      "هذا الطلب ليس على دورة الاعتماد التجارية"
    );
  }
  if (!isMaterialState(order.materialState)) {
    throw new CommercialOrderError("CONFLICT", "حالة المواد غير معروفة");
  }
  if (order.commercialStatus === transition.to) {
    const [prior] = await tx
      .select({ id: schema.auditEvents.id })
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.entityType, "door_order"),
          eq(schema.auditEvents.entityId, order.id),
          eq(schema.auditEvents.eventType, transition.eventType)
        )
      )
      .for("update")
      .limit(1);
    if (!prior) {
      throw new CommercialOrderError(
        "CONFLICT",
        "حالة الطلب التجارية بلا سجل تدقيق مطابق"
      );
    }
    return {
      applied: false,
      orderId: order.id,
      canonicalNumber: order.canonicalNumber,
      commercialStatus: order.commercialStatus,
      materialState: order.materialState,
    };
  }
  if (order.commercialStatus !== transition.from) {
    throw new CommercialOrderError("CONFLICT", "انتقال الحالة التجارية غير مسموح");
  }
  if (command === "approve" && order.materialState !== "not_started") {
    throw new CommercialOrderError(
      "CONFLICT",
      "لا يمكن اعتماد الطلب إلا إذا كانت المواد لم تبدأ"
    );
  }
  if (command === "cancel") {
    if (
      BLOCKED_CANCEL_MATERIAL_STATES.some((state) => state === order.materialState) ||
      order.reservationAdvancePolicyId != null ||
      (await orderHasReservationHistory(tx, order.id))
    ) {
      throw new CommercialOrderError(
        "CONFLICT",
        "لا يمكن إلغاء الطلب بعد بدء حجز المواد"
      );
    }
  }

  const before: CommercialSnapshot = {
    commercialStatus: order.commercialStatus,
    materialState: order.materialState,
  };
  const after: CommercialSnapshot = {
    commercialStatus: transition.to,
    materialState: nextMaterialState(command, order.materialState),
  };

  await tx
    .update(schema.doorOrders)
    .set({
      commercialStatus: after.commercialStatus,
      materialState: after.materialState,
      ...(command === "approve" ? { priorityAt: order.priorityAt ?? now } : {}),
      updatedAt: now,
    })
    .where(eq(schema.doorOrders.id, order.id));

  await tx.insert(schema.auditEvents).values({
    eventType: transition.eventType,
    entityType: "door_order",
    entityId: order.id,
    canonicalNumber: order.canonicalNumber,
    actorStaffUserId,
    occurredAt: now,
    beforeJson: before,
    afterJson: after,
  });

  return {
    applied: true,
    orderId: order.id,
    canonicalNumber: order.canonicalNumber,
    commercialStatus: after.commercialStatus,
    materialState: after.materialState,
  };
}

const LEGACY_DOOR_STATUSES = [
  "new",
  "reviewing",
  "confirmed",
  "in_production",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type LegacyDoorStatus = (typeof LEGACY_DOOR_STATUSES)[number];

/**
 * Legacy labels that would bypass the commercial machine.
 * confirmed starts the old invoice path. cancelled skips safe cancellation.
 */
const LEGACY_STATUS_BLOCKED_ON_LIFECYCLE = new Set<LegacyDoorStatus>([
  "confirmed",
  "cancelled",
]);

export type LegacyStatusResult = {
  found: boolean;
  invoiceAllowed: boolean;
};

/**
 * Updates only the legacy status label.
 * Lifecycle-managed rows cannot be confirmed or cancelled here.
 * Historical rows with a null commercial status keep the previous behavior,
 * including the confirmed invoice side effect.
 */
export async function applyLegacyDoorStatus(
  tx: OrderTx,
  orderId: number,
  status: LegacyDoorStatus,
  now = Date.now()
): Promise<LegacyStatusResult> {
  const [order] = await tx
    .select({
      id: schema.doorOrders.id,
      commercialStatus: schema.doorOrders.commercialStatus,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .for("update")
    .limit(1);
  if (!order) return { found: false, invoiceAllowed: false };
  if (
    order.commercialStatus != null &&
    LEGACY_STATUS_BLOCKED_ON_LIFECYCLE.has(status)
  ) {
    throw new CommercialOrderError(
      "CONFLICT",
      status === "confirmed"
        ? "لا يمكن تأكيد طلب تجاري خارج دورة الاعتماد"
        : "لا يمكن إلغاء الطلب من مسار الحالة القديم"
    );
  }
  await tx
    .update(schema.doorOrders)
    .set({ status, updatedAt: now })
    .where(eq(schema.doorOrders.id, order.id));
  return {
    found: true,
    invoiceAllowed: order.commercialStatus == null && status === "confirmed",
  };
}

async function historyExists(
  tx: OrderTx,
  table:
    | typeof schema.auditEvents
    | typeof schema.taxInvoices
    | typeof schema.workOrders
    | typeof schema.qcInspections
    | typeof schema.distributorPayments
    | typeof schema.packingOrders
    | typeof schema.complaints
    | typeof schema.materialReleases,
  where: ReturnType<typeof and>
): Promise<boolean> {
  const [row] = await tx
    .select({ id: table.id })
    .from(table)
    .where(where)
    .limit(1);
  return Boolean(row);
}

/**
 * Hard-delete an order.
 * A lifecycle-managed row can be deleted only while it is an untouched draft.
 * A null commercial status is legacy data and keeps the previous delete behavior.
 */
export async function deleteDoorOrderIfEligible(
  tx: OrderTx,
  orderId: number
): Promise<{ deleted: boolean }> {
  const [order] = await tx
    .select({
      id: schema.doorOrders.id,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      commercialStatus: schema.doorOrders.commercialStatus,
      materialState: schema.doorOrders.materialState,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .for("update")
    .limit(1);
  if (!order) return { deleted: false };
  if (order.commercialStatus != null) {
    if (order.commercialStatus !== "draft" || order.materialState !== "not_started") {
      throw new CommercialOrderError(
        "CONFLICT",
        "لا يمكن حذف طلب دخل دورة الاعتماد التجارية"
      );
    }
    const blocked = [
      await historyExists(
        tx,
        schema.auditEvents,
        and(
          eq(schema.auditEvents.entityType, "door_order"),
          eq(schema.auditEvents.entityId, order.id)
        )
      ),
      await historyExists(
        tx,
        schema.taxInvoices,
        and(
          eq(schema.taxInvoices.sourceType, "door_order"),
          eq(schema.taxInvoices.sourceId, order.id)
        )
      ),
      await historyExists(
        tx,
        schema.workOrders,
        and(eq(schema.workOrders.orderId, order.id))
      ),
      await historyExists(
        tx,
        schema.materialReleases,
        eq(schema.materialReleases.doorOrderId, order.id)
      ),
      await historyExists(
        tx,
        schema.qcInspections,
        and(
          eq(schema.qcInspections.orderSource, "door_order"),
          eq(schema.qcInspections.sourceId, order.id)
        )
      ),
    ];
    if (order.canonicalNumber) {
      blocked.push(
        await historyExists(
          tx,
          schema.distributorPayments,
          and(eq(schema.distributorPayments.orderNumber, order.canonicalNumber))
        ),
        await historyExists(
          tx,
          schema.packingOrders,
          and(eq(schema.packingOrders.orderNumber, order.canonicalNumber))
        ),
        await historyExists(
          tx,
          schema.complaints,
          and(eq(schema.complaints.orderNumber, order.canonicalNumber))
        )
      );
    }
    if (blocked.some(Boolean)) {
      throw new CommercialOrderError(
        "CONFLICT",
        "لا يمكن حذف مسودة لها سجل أعمال"
      );
    }
  }
  await tx.delete(schema.doorOrders).where(eq(schema.doorOrders.id, order.id));
  return { deleted: true };
}
