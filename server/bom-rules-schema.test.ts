/**
 * Phase 2B-4C-3A migration shape.
 * Behavioral proof is the disposable MySQL rehearsal and bom-rules.test.ts.
 */
import { readdirSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("BOM rule and snapshot migration", () => {
  const files = readdirSync("drizzle/migrations").filter(
    (name) => name.startsWith("0005_") && name.endsWith(".sql")
  );
  const sql = readFileSync(`drizzle/migrations/${files[0]}`, "utf8");

  it("creates the lineage, version, rule, and snapshot tables", () => {
    expect(files).toEqual(["0005_bom_rule_snapshots.sql"]);
    expect(sql).toContain("CREATE TABLE `bom_lineages`");
    expect(sql).toContain("CREATE TABLE `bom_rule_sets`");
    expect(sql).toContain("CREATE TABLE `bom_rules`");
    expect(sql).toContain("CREATE TABLE `bom_snapshots`");
    expect(sql).toContain("CREATE TABLE `bom_snapshot_lines`");
    expect(sql).toContain("UNIQUE(`scope_key`)");
    expect(sql).toContain("UNIQUE(`lineage_id`,`version`)");
    expect(sql).toContain("UNIQUE(`door_order_id`)");
    expect(sql).toContain("`expected_unit` varchar(50) NOT NULL");
    expect(sql).toContain("`required_qty` int NOT NULL");
    expect(sql).toContain("bom_lineages_scope_ck");
    expect(sql).toContain("bom_lineages_scope_immutable");
    const ruleSetTable = sql.slice(
      sql.indexOf("CREATE TABLE `bom_rule_sets`"),
      sql.indexOf("CREATE TABLE `bom_rules`")
    );
    expect(ruleSetTable).not.toContain("product_id");
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toContain("material_requirements");
    expect(sql).not.toContain("shortage_lines");
    expect(sql).not.toContain("reservation_lines");
    expect(sql).not.toContain("reserved_qty");
    expect(sql).not.toContain("material_releases");
  });

  it("references orders, staff, lineages, and inventory without cascading deletes", () => {
    expect(sql).toContain(
      "FOREIGN KEY (`lineage_id`) REFERENCES `bom_lineages`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain(
      "FOREIGN KEY (`door_order_id`) REFERENCES `door_orders`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain(
      "FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain(
      "FOREIGN KEY (`created_by_staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE restrict"
    );
    expect(sql).toContain(
      "FOREIGN KEY (`rule_id`) REFERENCES `bom_rules`(`id`) ON DELETE restrict"
    );
    expect(sql).not.toContain("ON DELETE cascade");
  });
});