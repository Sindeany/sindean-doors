import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("inventory ledger immutability migration", () => {
  const sql = readFileSync("drizzle/migrations/0009_inventory_ledger_immutable.sql", "utf8");
  const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8")) as {
    entries: Array<{ idx: number; tag: string; when: number }>;
  };

  it("rejects updates and deletes of inventory movements", () => {
    expect(sql).toContain("CREATE TRIGGER `inventory_transactions_append_only_update`");
    expect(sql).toContain("BEFORE UPDATE ON `inventory_transactions`");
    expect(sql).toContain("CREATE TRIGGER `inventory_transactions_append_only_delete`");
    expect(sql).toContain("BEFORE DELETE ON `inventory_transactions`");
    expect(sql).toContain("SIGNAL SQLSTATE '45000'");
    expect(sql).toContain("Inventory movements are append-only");
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\s+FROM\b/im);
    expect(sql).not.toMatch(/^\s*INSERT\b/im);
    const entry = journal.entries.find((item) => item.tag === "0009_inventory_ledger_immutable");
    expect(entry).toMatchObject({ idx: 9, when: 1792810000000 });
    expect(entry?.when).toBeGreaterThan(1792723992965);
    expect(journal.entries).toHaveLength(10);
  });

  it("keeps the Drizzle snapshot identical except the migration chain ids", () => {
    const previous = JSON.parse(
      readFileSync("drizzle/migrations/meta/0008_snapshot.json", "utf8")
    ) as { id: string; prevId: string };
    const next = JSON.parse(
      readFileSync("drizzle/migrations/meta/0009_snapshot.json", "utf8")
    ) as { id: string; prevId: string };
    expect(next.prevId).toBe(previous.id);
    expect(next.id).not.toBe(previous.id);
    const { id: previousId, prevId: previousPrev, ...previousBody } = previous;
    const { id: nextId, prevId: nextPrev, ...nextBody } = next;
    expect(previousId).toBe(previous.id);
    expect(previousPrev).toBe(previous.prevId);
    expect(nextId).toBe(next.id);
    expect(nextPrev).toBe(previous.id);
    expect(nextBody).toEqual(previousBody);
  });
});
