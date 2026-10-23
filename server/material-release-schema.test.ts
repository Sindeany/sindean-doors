import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("material release migration", () => {
  const sql = readFileSync("drizzle/migrations/0008_material_release.sql", "utf8");
  const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };

  it("adds the release, issue, and issue-line history", () => {
    expect(sql).toContain("CREATE TABLE `material_releases`");
    expect(sql).toContain("CREATE TABLE `material_issues`");
    expect(sql).toContain("CREATE TABLE `material_issue_lines`");
    expect(sql).toContain("UNIQUE(`door_order_id`)");
    expect(sql).toContain("UNIQUE(`idempotency_key`)");
    expect(sql).toContain("UNIQUE(`material_release_id`)");
    expect(sql).toContain("UNIQUE(`reservation_line_id`)");
    expect(sql).toContain("UNIQUE(`inventory_transaction_id`)");
    expect(sql).toContain("material_issue_lines_qty_ck");
    expect(sql).toContain("CHECK (`issued_qty` > 0)");
    expect(sql).toContain("ON DELETE restrict");
    expect(sql).not.toContain("commercial_release");
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    const entry = journal.entries.find((item) => item.tag === "0008_material_release");
    expect(entry?.when).toBeGreaterThan(1792683690934);
  });
});
