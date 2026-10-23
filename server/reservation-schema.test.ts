import { readFileSync, readdirSync } from "fs";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";
import { doorOrders } from "../drizzle/schema.js";

describe("inventory reservation migration", () => {
  const files = readdirSync("drizzle/migrations").filter(
    (name) => name.startsWith("0007_") && name.endsWith(".sql")
  );
  const sql = readFileSync(`drizzle/migrations/${files[0]}`, "utf8");
  const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };

  it("adds the reservation cache, policy capture, and lines", () => {
    expect(files).toEqual(["0007_inventory_reservation.sql"]);
    expect(sql).toContain("ADD `reserved_qty` int DEFAULT 0 NOT NULL");
    expect(sql).toContain("ADD `reservation_advance_policy_id` int");
    expect(sql).toContain("CREATE TABLE `reservation_lines`");
    expect(sql).toContain("UNIQUE(`bom_snapshot_line_id`)");
    expect(sql).toContain("inventory_items_reserved_qty_ck");
    expect(sql).toContain("reservation_lines_qty_ck");
    expect(sql).toContain("door_orders_reservation_policy_immutable");
    expect(sql).toContain("ON DELETE restrict");
    expect(sql).toContain(
      "ADD CONSTRAINT `door_orders_reservation_advance_policy_id_advance_policies_id_fk` FOREIGN KEY (`reservation_advance_policy_id`) REFERENCES `advance_policies`(`id`) ON DELETE restrict ON UPDATE no action"
    );
    const snapshot = JSON.parse(
      readFileSync("drizzle/migrations/meta/0007_snapshot.json", "utf8")
    ) as {
      tables: {
        door_orders: {
          foreignKeys: Record<string, { tableTo: string; onDelete: string; columnsFrom: string[] }>;
        };
      };
    };
    const fk =
      snapshot.tables.door_orders.foreignKeys
        .door_orders_reservation_advance_policy_id_advance_policies_id_fk;
    expect(fk).toMatchObject({
      tableTo: "advance_policies",
      onDelete: "restrict",
      columnsFrom: ["reservation_advance_policy_id"],
    });
    const configured = getTableConfig(doorOrders).foreignKeys.find(
      (key) => key.getName() === "door_orders_reservation_advance_policy_id_advance_policies_id_fk"
    );
    expect(configured?.onDelete).toBe("restrict");
    expect(configured?.reference().foreignTable).toBeDefined();
    expect(sql).not.toContain("material_releases");
    expect(sql).not.toContain("shortage_lines");
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    const entry = journal.entries.find((item) => item.tag === "0007_inventory_reservation");
    expect(entry?.when).toBeGreaterThan(1792679059557);
  });
});
