/**
 * The shared MySQL pool must not force every BIGINT into a string.
 * COUNT(*) is a BIGINT. Existing journal numbering does `(count ?? 0) + 1`.
 * A string count turns 5 + 1 into "51" and the next entry into JE-2026-000051.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import * as schema from "../drizzle/schema.js";
import { formatEntryNumber } from "./accounting.router.js";
import { requiredAdvanceMinor } from "./advance-payment.js";

describe("MySQL BIGINT driver compatibility", () => {
  const dbSource = readFileSync("server/db.ts", "utf8");

  it("returns safe BIGINT values as numbers and does not enable bigNumberStrings", () => {
    expect(dbSource).toContain("supportBigNumbers: true");
    expect(dbSource).not.toMatch(/bigNumberStrings\s*:\s*true/);
  });

  it("numbers the next journal entry 000006 when COUNT(*) is 5", () => {
    const accounting = readFileSync("server/accounting.router.ts", "utf8");
    expect(accounting).toContain("const counter = (countResult[0]?.cnt ?? 0) + 1;");
    const cnt = 5;
    const counter = (cnt ?? 0) + 1;
    expect(typeof counter).toBe("number");
    expect(counter).toBe(6);
    expect(formatEntryNumber(counter, 2026)).toBe("JE-2026-000006");

    const stringCount = "5" as unknown as number;
    const corrupted = (stringCount ?? 0) + 1;
    expect(corrupted).toBe("51");
    expect(formatEntryNumber(corrupted as unknown as number, 2026)).toBe("JE-2026-000051");
  });

  it("maps authoritative minor units with BigInt for safe numbers and unsafe strings", () => {
    const accepted = schema.doorOrders.acceptedTotalMinor.mapFromDriverValue.bind(
      schema.doorOrders.acceptedTotalMinor
    ) as (value: number | string) => bigint;
    const amount = schema.orderPayments.amountMinor.mapFromDriverValue.bind(
      schema.orderPayments.amountMinor
    ) as (value: number | string) => bigint;

    expect(accepted(10001)).toBe(10001n);
    expect(amount(10001)).toBe(10001n);
    expect(amount(9007199254740991)).toBe(9007199254740991n);
    expect(amount("9007199254740993")).toBe(9007199254740993n);
    expect(requiredAdvanceMinor(amount("9007199254740993"), 1)).toBe(900719925475n);
  });
});
