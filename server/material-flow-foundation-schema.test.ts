/**
 * Phase 2B-4C-2A — dormant material-flow foundation schema.
 * Behavioral proof is the disposable MySQL rehearsal. This only guards the SQL shape.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("material flow foundation migration", () => {
  const sql = readFileSync("drizzle/migrations/0004_orange_argent.sql", "utf8");

  it("adds dormant door_orders columns without converting legacy status", () => {
    expect(sql).toContain("ADD `canonical_number` varchar(32)");
    expect(sql).toContain(
      "ADD `commercial_status` enum('draft','coordinator_review','admin_review','approved','rejected','cancelled')"
    );
    expect(sql).toContain(
      "ADD `material_state` enum('not_started','pending_materials','partially_reserved','fully_reserved','released') DEFAULT 'not_started' NOT NULL"
    );
    expect(sql).toContain("ADD `accepted_total_minor` bigint");
    expect(sql).toContain("ADD `priority_at` bigint");
    expect(sql).toContain("UNIQUE(`canonical_number`)");
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DROP\b/im);
    expect(sql).not.toContain("'confirmed'");
    expect(sql).not.toContain("reservation_lines");
    expect(sql).not.toContain("material_releases");
    expect(sql).not.toContain("reserved_qty");
    expect(sql).not.toContain("bom_snapshots");
  });

  it("creates the audit shell and a year-keyed counter", () => {
    expect(sql).toContain("CREATE TABLE `audit_events`");
    expect(sql).toContain(
      "FOREIGN KEY (`actor_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain("CREATE TABLE `order_number_counters`");
    expect(sql).toContain("PRIMARY KEY(`year`)");
  });
});
