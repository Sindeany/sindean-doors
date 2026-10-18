import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";
import { allocateCanonicalOrderNumber } from "./canonical-order-number.js";

export const FACTORY_ORDER_CREATED_EVENT = "order.created";

/** Order fields a sales actor may supply. Authority fields are not part of this input. */
export type CanonicalFactoryOrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  productId: string;
  productName: string;
  totalDoors: number;
  selections: Record<string, string>;
  subSelections: Record<string, unknown>;
  dimensions: Record<string, unknown> | null;
  basePrice: number;
  totalPrice: number;
  notes: string | null;
};

type CreateTx = Pick<MySql2Database<typeof schema>, "insert" | "select" | "update">;

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number } | undefined)?.insertId);
  return Number.isInteger(insertId) && insertId > 0 ? insertId : 0;
}

/**
 * Allocates one canonical number, inserts the draft factory order, and appends
 * order.created. The caller owns the transaction, so an audit failure rolls
 * the order and the counter back together.
 * `actorStaffUserId` comes from the authenticated staff session.
 */
export async function insertCanonicalFactoryOrder(
  tx: CreateTx,
  input: CanonicalFactoryOrderInput,
  actorStaffUserId: number,
  now = Date.now()
): Promise<{ id: number; canonicalNumber: string }> {
  if (!Number.isInteger(actorStaffUserId) || actorStaffUserId <= 0) {
    throw new Error("factory order actor is missing");
  }
  const canonicalNumber = await allocateCanonicalOrderNumber(tx, new Date(now));
  const inserted = await tx.insert(schema.doorOrders).values({
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    productId: input.productId,
    productName: input.productName,
    totalDoors: input.totalDoors,
    selections: input.selections,
    subSelections: input.subSelections,
    dimensions: input.dimensions,
    basePrice: input.basePrice,
    totalPrice: input.totalPrice,
    notes: input.notes,
    status: "new",
    canonicalNumber,
    commercialStatus: "draft",
    materialState: "not_started",
    createdAt: now,
    updatedAt: now,
  });
  const orderId = insertIdOf(inserted);
  if (orderId <= 0) throw new Error("door order id was not created");
  await tx.insert(schema.auditEvents).values({
    eventType: FACTORY_ORDER_CREATED_EVENT,
    entityType: "door_order",
    entityId: orderId,
    canonicalNumber,
    actorStaffUserId,
    occurredAt: now,
    beforeJson: null,
    afterJson: {
      commercialStatus: "draft",
      materialState: "not_started",
    },
  });
  return { id: orderId, canonicalNumber };
}
