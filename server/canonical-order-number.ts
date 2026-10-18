import { eq, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";
import { FACTORY_TIME_ZONE, factoryCalendarYear } from "./factory-time.js";

export const CANONICAL_ORDER_SEQUENCE_MAX = 999_999;

/**
 * Create-transaction lock order.
 *
 * 1. `order_number_counters` row for the factory year
 *    (idempotent INSERT ... ON DUPLICATE KEY UPDATE, then SELECT ... FOR UPDATE)
 * 2. `door_orders` INSERT of the new row, including its canonical number
 * 3. `audit_events` INSERT of `order.created`
 *
 * Approval, BOM snapshot, reservation, and Material Release run later on an
 * existing order. Those flows must lock that `door_orders` row first and must
 * not take this counter lock. The number is immutable, so they can keep an
 * order-first lock order among the order row and their own resources.
 */
export const FACTORY_ORDER_CREATE_LOCK_ORDER = [
  "order_number_counters.year",
  "door_orders.insert",
  "audit_events.insert",
] as const;

export class CanonicalSequenceExhaustedError extends Error {
  readonly year: number;

  constructor(year: number) {
    super(
      `canonical order sequence for ${year} exceeds ${CANONICAL_ORDER_SEQUENCE_MAX}`
    );
    this.name = "CanonicalSequenceExhaustedError";
    this.year = year;
  }
}

type CounterExecutor = Pick<
  MySql2Database<typeof schema>,
  "insert" | "select" | "update"
>;

export function nextCanonicalSequence(year: number, lastValue: number): number {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("factory year must be a four-digit integer");
  }
  if (!Number.isInteger(lastValue) || lastValue < 0) {
    throw new Error("order number counter last_value is invalid");
  }
  const next = lastValue + 1;
  if (next > CANONICAL_ORDER_SEQUENCE_MAX) {
    throw new CanonicalSequenceExhaustedError(year);
  }
  return next;
}

export function formatCanonicalOrderNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("factory year must be a four-digit integer");
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("canonical sequence must be a positive integer");
  }
  if (sequence > CANONICAL_ORDER_SEQUENCE_MAX) {
    throw new CanonicalSequenceExhaustedError(year);
  }
  return `SD-${year}-${String(sequence).padStart(6, "0")}`;
}

/**
 * Allocates the next SD-{year}-{sequence} inside the caller's transaction.
 *
 * A new year is created with last_value 0 using INSERT ... ON DUPLICATE KEY
 * UPDATE, then the row is locked with SELECT ... FOR UPDATE. Two transactions
 * that are both the first order of a year cannot both read 0: the primary key
 * on `year` makes the second INSERT wait until the first transaction commits.
 * After that wait, SELECT ... FOR UPDATE sees the committed last_value.
 * Rolling this transaction back undoes the counter update as well, so a failed
 * order insert does not consume the number.
 *
 * `now` is a server instant. The year is the Asia/Riyadh calendar year.
 */
export async function allocateCanonicalOrderNumber(
  tx: CounterExecutor,
  now: Date = new Date()
): Promise<string> {
  const year = factoryCalendarYear(now, FACTORY_TIME_ZONE);
  const updatedAt = now.getTime();

  await tx
    .insert(schema.orderNumberCounters)
    .values({
      year,
      lastValue: 0,
      updatedAt,
    })
    .onDuplicateKeyUpdate({
      set: { year: sql`${schema.orderNumberCounters.year}` },
    });

  const [counter] = await tx
    .select({ lastValue: schema.orderNumberCounters.lastValue })
    .from(schema.orderNumberCounters)
    .where(eq(schema.orderNumberCounters.year, year))
    .for("update")
    .limit(1);

  if (!counter || !Number.isInteger(counter.lastValue)) {
    throw new Error(`order number counter for ${year} was not initialized`);
  }

  const next = nextCanonicalSequence(year, counter.lastValue);
  await tx
    .update(schema.orderNumberCounters)
    .set({ lastValue: next, updatedAt })
    .where(eq(schema.orderNumberCounters.year, year));

  return formatCanonicalOrderNumber(year, next);
}
