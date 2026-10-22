/**
 * Phase 2B-4C-3B-1 migration shape.
 * Behavioral proof is advance-payment.test.ts and the disposable MySQL rehearsal.
 */
import { readFileSync, readdirSync } from "fs";
import { describe, expect, it } from "vitest";

describe("advance payment eligibility migration", () => {
  const files = readdirSync("drizzle/migrations").filter(
    (name) => name.startsWith("0006_") && name.endsWith(".sql")
  );
  const sql = readFileSync(`drizzle/migrations/${files[0]}`, "utf8");
  const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };

  it("creates only the advance policy and confirmed payment tables", () => {
    expect(files).toEqual(["0006_advance_payment_eligibility.sql"]);
    expect(sql).toContain("CREATE TABLE `advance_policies`");
    expect(sql).toContain("CREATE TABLE `order_payments`");
    expect(sql).toContain("`required_advance_bps` int NOT NULL");
    expect(sql).toContain("`amount_minor` bigint NOT NULL");
    expect(sql).toContain("`reference` varchar(128)");
    expect(sql).toContain("UNIQUE(`is_current`)");
    expect(sql).toContain("advance_policies_bps_ck");
    expect(sql).toContain("advance_policies_current_ck");
    expect(sql).toContain("order_payments_amount_ck");
    expect(sql).toContain("`amount_minor` > 0");
    expect(sql).toContain("BETWEEN 0 AND 10000");
    expect(sql).toContain("advance_policies_term_immutable");
    expect(sql).toContain("order_payments_append_only_update");
    expect(sql).toContain("order_payments_append_only_delete");
    expect(sql).toContain("door_orders_accepted_total_immutable");
    expect(sql).not.toContain("ADD `accepted_total_minor`");
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toContain("reservation_lines");
    expect(sql).not.toContain("material_releases");
    expect(sql).not.toContain("reserved_qty");
    expect(sql).not.toContain("refunds");
    expect(sql).not.toContain("payment_allocations");
  });

  it("keeps financial history when an order or staff user is deleted", () => {
    expect(sql).toContain(
      "FOREIGN KEY (`published_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain(
      "FOREIGN KEY (`door_order_id`) REFERENCES `door_orders`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain(
      "FOREIGN KEY (`recorded_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain("CREATE INDEX `order_payments_door_order_idx`");
    expect(sql).not.toContain("ON DELETE cascade");
  });

  it("is journaled after the BOM snapshot migration", () => {
    const entry = journal.entries.find((item) => item.tag === "0006_advance_payment_eligibility");
    expect(entry?.when).toBeGreaterThan(1792446130142);
  });
});
