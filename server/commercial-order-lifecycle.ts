import { eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";

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

type OrderTx = Pick<MySql2Database<typeof schema>, "insert" | "select" | "update">;

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
  if (
    command === "cancel" &&
    BLOCKED_CANCEL_MATERIAL_STATES.some((state) => state === order.materialState)
  ) {
    throw new CommercialOrderError(
      "CONFLICT",
      "لا يمكن إلغاء الطلب بعد بدء حجز المواد"
    );
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
