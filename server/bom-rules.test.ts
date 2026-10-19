/**
 * Versioned BOM rules and immutable order snapshots.
 * Procedures run against an in-memory transaction that rolls back on throw.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema.js";
import {
  MAX_BOM_QUANTITY,
  bomLineageScope,
  conflictFromDatabaseError,
  evaluateBomRules,
  rejectBomSnapshotLineMutation,
  rejectBomSnapshotMutation,
} from "./bom-rules.js";
import type { StaffIdentity, StaffRole } from "./staff-sessions.js";

type OrderRow = {
  id: number;
  canonicalNumber: string | null;
  commercialStatus: string | null;
  materialState: string;
  productId: string;
  totalDoors: number | null;
  selections: Record<string, string>;
  dimensions: Record<string, unknown> | null;
};

type ItemRow = { id: number; unit: string; currentQty: number };
type AnyRow = Record<string, unknown> & { id: number };

const state = vi.hoisted(() => ({
  orders: new Map<number, OrderRow>(),
  items: new Map<number, ItemRow>(),
  lineages: [] as AnyRow[],
  ruleSets: [] as AnyRow[],
  rules: [] as AnyRow[],
  snapshots: [] as AnyRow[],
  lines: [] as AnyRow[],
  audits: [] as AnyRow[],
  nextLineageId: 1,
  nextRuleSetId: 1,
  nextRuleId: 1,
  nextSnapshotId: 1,
  nextLineId: 1,
  nextAuditId: 1,
  lineInserts: 0,
  failLineInsertAt: null as number | null,
  failAuditEvent: null as string | null,
  forbiddenWrites: [] as string[],
}));

const { validateStaffSession } = vi.hoisted(() => ({
  validateStaffSession: vi.fn(),
}));

function clauseValues(clause: unknown): unknown[] {
  const values: unknown[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if ("value" in node && "encoder" in node) {
      values.push((node as { value: unknown }).value);
      return;
    }
    const chunks = (node as { queryChunks?: unknown[] }).queryChunks;
    if (Array.isArray(chunks)) chunks.forEach(visit);
  };
  visit(clause);
  return values;
}

function numbers(values: unknown[]): number[] {
  return values.filter((value): value is number => typeof value === "number");
}

function snapshotState() {
  return {
    orders: new Map([...state.orders].map(([id, row]) => [id, { ...row, selections: { ...row.selections }, dimensions: row.dimensions ? { ...row.dimensions } : null }])),
    items: new Map([...state.items].map(([id, row]) => [id, { ...row }])),
    lineages: state.lineages.map((row) => ({ ...row })),
    ruleSets: state.ruleSets.map((row) => ({ ...row })),
    rules: state.rules.map((row) => ({ ...row })),
    snapshots: state.snapshots.map((row) => ({ ...row })),
    lines: state.lines.map((row) => ({ ...row })),
    audits: state.audits.map((row) => ({ ...row, beforeJson: row.beforeJson, afterJson: row.afterJson })),
    nextLineageId: state.nextLineageId,
    nextRuleSetId: state.nextRuleSetId,
    nextRuleId: state.nextRuleId,
    nextSnapshotId: state.nextSnapshotId,
    nextLineId: state.nextLineId,
    nextAuditId: state.nextAuditId,
    lineInserts: state.lineInserts,
  };
}

function restoreState(saved: ReturnType<typeof snapshotState>) {
  state.orders = saved.orders;
  state.items = saved.items;
  state.lineages = saved.lineages;
  state.ruleSets = saved.ruleSets;
  state.rules = saved.rules;
  state.snapshots = saved.snapshots;
  state.lines = saved.lines;
  state.audits = saved.audits;
  state.nextLineageId = saved.nextLineageId;
  state.nextRuleSetId = saved.nextRuleSetId;
  state.nextRuleId = saved.nextRuleId;
  state.nextSnapshotId = saved.nextSnapshotId;
  state.nextLineId = saved.nextLineId;
  state.nextAuditId = saved.nextAuditId;
  state.lineInserts = saved.lineInserts;
}

function columnPairs(clause: unknown): Array<{ column: string; value: unknown }> {
  const pairs: Array<{ column: string; value: unknown }> = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as {
      name?: unknown;
      table?: unknown;
      value?: unknown;
      encoder?: unknown;
      queryChunks?: unknown[];
    };
    if (Array.isArray(record.queryChunks)) {
      let column = "";
      let value: unknown;
      let hasValue = false;
      for (const chunk of record.queryChunks) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "name" in chunk &&
          "table" in chunk &&
          typeof (chunk as { name?: unknown }).name === "string"
        ) {
          column = (chunk as { name: string }).name;
        }
        if (chunk && typeof chunk === "object" && "encoder" in chunk && "value" in chunk) {
          value = (chunk as { value: unknown }).value;
          hasValue = true;
        }
      }
      if (column && hasValue) pairs.push({ column, value });
      record.queryChunks.forEach(visit);
    }
  };
  visit(clause);
  return pairs;
}

function matchesPairs(row: AnyRow, pairs: Array<{ column: string; value: unknown }>): boolean {
  return pairs.every((pair) => {
    if (pair.column === "id") return row.id === pair.value;
    if (pair.column === "lineage_id") return row.lineageId === pair.value;
    if (pair.column === "lineage_code") return row.lineageCode === pair.value;
    if (pair.column === "scope_key") return row.scopeKey === pair.value;
    if (pair.column === "rule_set_status") return row.status === pair.value;
    if (pair.column === "door_order_id") return row.doorOrderId === pair.value;
    if (pair.column === "rule_set_id") return row.ruleSetId === pair.value;
    if (pair.column === "snapshot_id") return row.snapshotId === pair.value;
    if (pair.column === "entity_type") return row.entityType === pair.value;
    if (pair.column === "entity_id") return row.entityId === pair.value;
    if (pair.column === "event_type") return row.eventType === pair.value;
    return true;
  });
}

function rowsFor(table: unknown, clause: unknown): AnyRow[] {
  const values = clauseValues(clause);
  const nums = numbers(values);
  const pairs = columnPairs(clause);
  if (table === schema.doorOrders) {
    const row = state.orders.get(nums[0] ?? -1);
    return row ? [row as unknown as AnyRow] : [];
  }
  if (table === schema.inventoryItems) {
    const row = state.items.get(nums[0] ?? -1);
    return row ? [row as unknown as AnyRow] : [];
  }
  if (table === schema.bomLineages) {
    return state.lineages.filter((row) => matchesPairs(row, pairs));
  }
  if (table === schema.bomRuleSets) {
    return state.ruleSets
      .filter((row) => matchesPairs(row, pairs))
      .sort((left, right) => Number(right.version) - Number(left.version));
  }
  if (table === schema.bomRules) {
    return state.rules
      .filter((row) => row.ruleSetId === nums[0])
      .sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder));
  }
  if (table === schema.bomSnapshots) {
    return state.snapshots.filter((row) => row.doorOrderId === nums[0]);
  }
  if (table === schema.bomSnapshotLines) {
    return state.lines
      .filter((row) => row.snapshotId === nums[0])
      .sort((left, right) => Number(left.lineNumber) - Number(right.lineNumber));
  }
  if (table === schema.auditEvents) {
    return state.audits.filter((row) => matchesPairs(row, pairs));
  }
  throw new Error("unexpected table read");
}

function chain(read: () => AnyRow[]) {
  const node = {
    then(onFulfilled: (rows: AnyRow[]) => unknown, onRejected?: (error: unknown) => unknown) {
      return Promise.resolve(read()).then(onFulfilled, onRejected);
    },
    for(mode: string) {
      if (mode !== "update") throw new Error(`expected FOR UPDATE, got ${mode}`);
      return node;
    },
    orderBy() {
      return node;
    },
    limit(count: number) {
      return Promise.resolve(read().slice(0, count));
    },
  };
  return node;
}

function bomTx() {
  return {
    select() {
      return {
        from(table: unknown) {
          return {
            where(clause: unknown) {
              return chain(() => rowsFor(table, clause));
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        async values(row: AnyRow) {
          if (table === schema.inventoryItems || table === schema.inventoryTransactions) {
            state.forbiddenWrites.push("inventory");
            throw new Error("inventory mutated");
          }
          if (table === schema.doorOrders) {
            state.forbiddenWrites.push("door_order");
            throw new Error("door order mutated");
          }
          if (table === schema.bomLineages) {
            if (
              state.lineages.some(
                (lineage) => lineage.lineageCode === row.lineageCode || lineage.scopeKey === row.scopeKey
              )
            ) {
              const duplicate = new Error("Duplicate entry") as Error & { errno: number; code: string };
              duplicate.errno = 1062;
              duplicate.code = "ER_DUP_ENTRY";
              throw duplicate;
            }
            const id = state.nextLineageId++;
            state.lineages.push({ ...row, id });
            return [{ insertId: id }];
          }
          if (table === schema.bomRuleSets) {
            const id = state.nextRuleSetId++;
            state.ruleSets.push({ ...row, id });
            return [{ insertId: id }];
          }
          if (table === schema.bomRules) {
            const id = state.nextRuleId++;
            state.rules.push({ ...row, id });
            return [{ insertId: id }];
          }
          if (table === schema.bomSnapshots) {
            const id = state.nextSnapshotId++;
            state.snapshots.push({ ...row, id });
            return [{ insertId: id }];
          }
          if (table === schema.bomSnapshotLines) {
            state.lineInserts += 1;
            if (state.failLineInsertAt != null && state.lineInserts === state.failLineInsertAt) {
              throw new Error("forced line failure");
            }
            const id = state.nextLineId++;
            state.lines.push({ ...row, id });
            return [{ insertId: id }];
          }
          if (table === schema.auditEvents) {
            if (state.failAuditEvent != null && row.eventType === state.failAuditEvent) {
              throw new Error("forced audit failure");
            }
            const id = state.nextAuditId++;
            state.audits.push({ ...row, id });
            return [{ insertId: id }];
          }
          throw new Error("unexpected insert");
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: AnyRow) {
          return {
            async where(clause: unknown) {
              if (table === schema.doorOrders) {
                state.forbiddenWrites.push("door_order");
                throw new Error("door order mutated");
              }
              if (table === schema.inventoryItems) {
                state.forbiddenWrites.push("inventory");
                throw new Error("inventory mutated");
              }
              if (table === schema.bomSnapshots || table === schema.bomSnapshotLines) {
                state.forbiddenWrites.push("snapshot");
                throw new Error("snapshot mutated");
              }
              if (table === schema.bomLineages) {
                throw new Error("lineage scope mutated");
              }
              if (table !== schema.bomRuleSets) throw new Error("unexpected update");
              const id = numbers(clauseValues(clause))[0];
              const row = state.ruleSets.find((entry) => entry.id === id);
              if (!row) throw new Error("missing rule set");
              Object.assign(row, values);
            },
          };
        },
      };
    },
    delete(table: unknown) {
      return {
        async where(clause: unknown) {
          if (table !== schema.bomRules) throw new Error("unexpected delete");
          const ruleSetId = numbers(clauseValues(clause))[0];
          state.rules = state.rules.filter((row) => row.ruleSetId !== ruleSetId);
        },
      };
    },
  };
}

vi.mock("./staff-sessions.js", async () => {
  const actual = await vi.importActual<typeof import("./staff-sessions.js")>("./staff-sessions.js");
  return { ...actual, validateStaffSession };
});

vi.mock("./db.js", async () => {
  const realSchema = await import("../drizzle/schema.js");
  return {
    schema: realSchema,
    pool: {},
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 1,
                token: "legacy-admin",
                expiresAt: Date.now() + 60_000,
                createdAt: Date.now(),
              },
            ],
          }),
        }),
      }),
      transaction: async (fn: (tx: ReturnType<typeof bomTx>) => Promise<unknown>) => {
        const saved = snapshotState();
        try {
          return await fn(bomTx());
        } catch (error) {
          restoreState(saved);
          throw error;
        }
      },
    },
  };
});

import { appRouter } from "./routers.js";

function staff(roles: StaffRole[], userId = 55): StaffIdentity {
  return {
    userId,
    sessionId: 900,
    name: "موظف اختبار",
    loginName: "bom-test",
    roles,
    expiresAt: Date.now() + 60_000,
  };
}

function seedOrder(partial: Partial<OrderRow> = {}) {
  const id = partial.id ?? 7;
  state.orders.set(id, {
    id,
    canonicalNumber: partial.canonicalNumber === undefined ? "SD-2026-000007" : partial.canonicalNumber,
    commercialStatus: partial.commercialStatus === undefined ? "approved" : partial.commercialStatus,
    materialState: partial.materialState ?? "pending_materials",
    productId: partial.productId ?? "interior-door",
    totalDoors: partial.totalDoors === undefined ? 2 : partial.totalDoors,
    selections: partial.selections ?? { hinge: "concealed" },
    dimensions: partial.dimensions === undefined ? { width: 90, height: 210 } : partial.dimensions,
  });
}

function seedItem(id: number, unit = "piece", currentQty = 40) {
  state.items.set(id, { id, unit, currentQty });
}

const sessions = new Map<string, StaffIdentity>();

function caller(identity: StaffIdentity | null, extra: Record<string, unknown> = {}) {
  const token = identity ? `staff-${identity.userId}-${identity.roles.join(".")}` : undefined;
  if (identity && token) sessions.set(token, identity);
  validateStaffSession.mockImplementation(async (presented: string | undefined) => {
    if (!presented) return null;
    return sessions.get(presented) ?? null;
  });
  return appRouter.createCaller({
    staffToken: token,
    ...extra,
  });
}

const admin = () => caller(staff(["admin"], 11));
const manager = () => caller(staff(["production_manager"], 22));
const both = () => caller(staff(["admin", "production_manager"], 33));

beforeEach(() => {
  state.orders = new Map();
  state.items = new Map();
  state.lineages = [];
  state.ruleSets = [];
  state.rules = [];
  state.snapshots = [];
  state.lines = [];
  state.audits = [];
  state.nextLineageId = 1;
  state.nextRuleSetId = 1;
  state.nextRuleId = 1;
  state.nextSnapshotId = 1;
  state.nextLineId = 1;
  state.nextAuditId = 1;
  state.lineInserts = 0;
  state.failLineInsertAt = null;
  state.failAuditEvent = null;
  state.forbiddenWrites = [];
  validateStaffSession.mockReset();
  sessions.clear();
});

async function draftWithRules(rules: Array<Record<string, unknown>>) {
  const created = await admin().bomRules.createDraft({
    lineageCode: "factory-door",
    name: "Door materials",
  });
  await admin().bomRules.setRules({ ruleSetId: created.ruleSetId, rules: rules as never });
  return created;
}

describe("BOM rule publishing", () => {
  it("lets an admin edit a draft and replace its rules", async () => {
    seedItem(5);
    const created = await admin().bomRules.createDraft({
      lineageCode: "factory-door",
      name: "Draft materials",
    });
    await admin().bomRules.updateDraft({
      ruleSetId: created.ruleSetId,
      name: "Door materials",
    });
    await admin().bomRules.setRules({
      ruleSetId: created.ruleSetId,
      rules: [{ kind: "fixed_per_order", inventoryItemId: 5, quantity: 2 }],
    });
    await admin().bomRules.setRules({
      ruleSetId: created.ruleSetId,
      rules: [{ kind: "fixed_per_door", inventoryItemId: 5, quantity: 4 }],
    });
    expect(state.ruleSets[0]).toMatchObject({ name: "Door materials", status: "draft", version: 1 });
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0]).toMatchObject({ kind: "fixed_per_door", quantity: 4, sortOrder: 1 });
  });

  it("publishes only for admin and records the staff actor", async () => {
    seedItem(5);
    const created = await draftWithRules([
      { kind: "fixed_per_order", inventoryItemId: 5, quantity: 2 },
    ]);
    await expect(
      caller(staff(["production_manager"], 22)).bomRules.publish({ ruleSetId: created.ruleSetId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller(staff(["stock_manager"], 44)).bomRules.publish({ ruleSetId: created.ruleSetId })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(null).bomRules.publish({ ruleSetId: created.ruleSetId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const published = await admin().bomRules.publish({ ruleSetId: created.ruleSetId });
    expect(published).toMatchObject({ version: 1, lineageCode: "factory-door" });
    expect(state.ruleSets[0]).toMatchObject({
      status: "published",
      publishedByStaffUserId: 11,
    });
    expect(state.ruleSets[0]?.publishedAt).toEqual(expect.any(Number));
    expect(state.audits).toEqual([
      expect.objectContaining({
        eventType: "bom.rule_set.published",
        entityType: "bom_rule_set",
        entityId: created.ruleSetId,
        actorStaffUserId: 11,
        canonicalNumber: null,
      }),
    ]);
  });

  it("rejects edits to a published rule set and opens the next draft instead", async () => {
    seedItem(5);
    const created = await draftWithRules([
      { kind: "fixed_per_order", inventoryItemId: 5, quantity: 2 },
    ]);
    await admin().bomRules.publish({ ruleSetId: created.ruleSetId });
    await expect(
      admin().bomRules.setRules({
        ruleSetId: created.ruleSetId,
        rules: [{ kind: "fixed_per_order", inventoryItemId: 5, quantity: 9 }],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      admin().bomRules.updateDraft({
        ruleSetId: created.ruleSetId,
        name: "Changed",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.rules[0]).toMatchObject({ quantity: 2 });
    expect(state.ruleSets[0]).toMatchObject({ status: "published", name: "Door materials" });
    const next = await admin().bomRules.createNextVersion({ ruleSetId: created.ruleSetId });
    expect(next.version).toBe(2);
    await admin().bomRules.setRules({
      ruleSetId: next.ruleSetId,
      rules: [{ kind: "fixed_per_order", inventoryItemId: 5, quantity: 9 }],
    });
    expect(state.ruleSets[0]).toMatchObject({ status: "published", version: 1 });
    expect(state.rules.filter((row) => row.ruleSetId === created.ruleSetId)[0]).toMatchObject({
      quantity: 2,
    });
    expect(state.rules.filter((row) => row.ruleSetId === next.ruleSetId)[0]).toMatchObject({
      quantity: 9,
    });
  });

  it("rejects a published set with a missing material before publication", async () => {
    const created = await admin().bomRules.createDraft({
      lineageCode: "factory-door",
      name: "Door materials",
    });
    await expect(
      admin().bomRules.setRules({
        ruleSetId: created.ruleSetId,
        rules: [{ kind: "fixed_per_order", inventoryItemId: 404, quantity: 1 }],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.rules).toHaveLength(0);
    await expect(admin().bomRules.publish({ ruleSetId: created.ruleSetId })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.audits).toHaveLength(0);
  });
});

describe("BOM snapshot generation", () => {
  async function publishedFactory() {
    seedItem(1, "piece", 80);
    seedItem(2, "cm", 500);
    seedItem(3, "piece", 20);
    const created = await draftWithRules([
      { kind: "fixed_per_door", inventoryItemId: 1, quantity: 3 },
      { kind: "linear_dimension", inventoryItemId: 2, quantity: 2, dimensionKey: "width" },
      {
        kind: "when_selection",
        inventoryItemId: 3,
        quantity: 1,
        selectionKey: "hinge",
        selectionValue: "concealed",
        appliesPer: "door",
      },
      {
        kind: "when_selection",
        inventoryItemId: 3,
        quantity: 9,
        selectionKey: "hinge",
        selectionValue: "other",
        appliesPer: "order",
      },
      {
        kind: "fixed_per_order",
        inventoryItemId: 1,
        quantity: 10,
        wasteNumerator: 1,
        wasteDenominator: 10,
      },
    ]);
    await admin().bomRules.publish({ ruleSetId: created.ruleSetId });
    return created;
  }

  it("uses the persisted order and ignores client manufacturing fields", async () => {
    seedOrder();
    const created = await publishedFactory();
    await expect(
      manager().bomRules.createOrderSnapshot({
        orderId: 7,
        selections: { hinge: "other" },
        dimensions: { width: 1 },
        quantity: 99,
        actorUserId: 1,
        canonicalNumber: "SD-FAKE",
        totalDoors: 100,
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.snapshots).toHaveLength(0);

    const result = await manager().bomRules.createOrderSnapshot({ orderId: 7 });
    expect(result).toMatchObject({
      created: true,
      orderId: 7,
      canonicalNumber: "SD-2026-000007",
      ruleSetId: created.ruleSetId,
      lineageCode: "factory-door",
      ruleSetVersion: 1,
    });
    expect(result.lines.map((line) => [line.inventoryItemId, line.requiredQty, line.unit])).toEqual([
      [1, 6, "piece"],
      [2, 180, "cm"],
      [3, 2, "piece"],
      [1, 11, "piece"],
    ]);
    expect(state.orders.get(7)).toMatchObject({
      canonicalNumber: "SD-2026-000007",
      commercialStatus: "approved",
      materialState: "pending_materials",
    });
    expect(state.items.get(1)?.currentQty).toBe(80);
    expect(state.forbiddenWrites).toEqual([]);
    expect(state.audits.filter((row) => row.eventType === "order.bom_snapshot.created")).toEqual([
      expect.objectContaining({
        entityType: "door_order",
        entityId: 7,
        canonicalNumber: "SD-2026-000007",
        actorStaffUserId: 22,
        afterJson: expect.objectContaining({
          snapshotId: result.snapshotId,
          ruleSetVersion: 1,
          commercialStatus: "approved",
          materialState: "pending_materials",
        }),
      }),
    ]);
    expect(JSON.stringify(state.audits)).not.toContain("customer");
  });

  it("allows a staff user who explicitly holds production_manager and denies admin alone", async () => {
    seedOrder();
    await publishedFactory();
    await expect(admin().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller(staff(["stock_manager"], 44)).bomRules.createOrderSnapshot({ orderId: 7 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(both().bomRules.createOrderSnapshot({ orderId: 7 })).resolves.toMatchObject({
      created: true,
    });
    expect(state.audits.at(-1)).toMatchObject({ actorStaffUserId: 33 });
  });

  it("rejects historical, non-approved, and non-pending orders", async () => {
    await publishedFactory();
    seedOrder({ commercialStatus: null });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seedOrder({ commercialStatus: "approved", canonicalNumber: null });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seedOrder({ commercialStatus: "admin_review", materialState: "not_started" });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    seedOrder({ commercialStatus: "approved", materialState: "not_started" });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.snapshots).toHaveLength(0);
    expect(state.audits.some((row) => row.eventType === "order.bom_snapshot.created")).toBe(false);
  });

  it("rejects a missing published rule set and a second factory lineage", async () => {
    seedOrder();
    seedItem(1);
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const first = await draftWithRules([{ kind: "fixed_per_order", inventoryItemId: 1, quantity: 1 }]);
    await admin().bomRules.publish({ ruleSetId: first.ruleSetId });
    await expect(
      admin().bomRules.createDraft({
        lineageCode: "other-door",
        name: "Other",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.lineages).toHaveLength(1);
    expect(state.lineages[0]).toMatchObject({ scopeKey: "factory", scopeKind: "factory" });
    expect(state.snapshots).toHaveLength(0);
  });

  it("uses the highest published version of the applicable lineage", async () => {
    seedOrder({ totalDoors: 1, selections: {}, dimensions: {} });
    seedItem(1, "piece", 10);
    const created = await draftWithRules([
      { kind: "fixed_per_order", inventoryItemId: 1, quantity: 1 },
    ]);
    await admin().bomRules.publish({ ruleSetId: created.ruleSetId });
    const next = await admin().bomRules.createNextVersion({ ruleSetId: created.ruleSetId });
    await admin().bomRules.setRules({
      ruleSetId: next.ruleSetId,
      rules: [{ kind: "fixed_per_order", inventoryItemId: 1, quantity: 4 }],
    });
    await admin().bomRules.publish({ ruleSetId: next.ruleSetId });
    const result = await manager().bomRules.createOrderSnapshot({ orderId: 7 });
    expect(result).toMatchObject({
      ruleSetId: next.ruleSetId,
      ruleSetVersion: 2,
      lineageCode: "factory-door",
    });
    expect(result.lines).toEqual([
      expect.objectContaining({ inventoryItemId: 1, requiredQty: 4 }),
    ]);
    expect(state.ruleSets.find((row) => row.id === created.ruleSetId)).toMatchObject({
      status: "published",
      version: 1,
    });
  });

  it("prefers the published product version over the factory-wide version", async () => {
    seedOrder({ productId: "fire-door", totalDoors: 1, selections: {}, dimensions: {} });
    seedItem(1, "piece", 10);
    const factory = await draftWithRules([
      { kind: "fixed_per_order", inventoryItemId: 1, quantity: 1 },
    ]);
    await admin().bomRules.publish({ ruleSetId: factory.ruleSetId });
    const specific = await admin().bomRules.createDraft({
      lineageCode: "fire-door-bom",
      name: "Fire door",
      productId: "fire-door",
    });
    await admin().bomRules.setRules({
      ruleSetId: specific.ruleSetId,
      rules: [{ kind: "fixed_per_order", inventoryItemId: 1, quantity: 7 }],
    });
    await admin().bomRules.publish({ ruleSetId: specific.ruleSetId });
    const result = await manager().bomRules.createOrderSnapshot({ orderId: 7 });
    expect(result).toMatchObject({
      ruleSetId: specific.ruleSetId,
      lineageCode: "fire-door-bom",
      ruleSetVersion: 1,
    });
    expect(result.lines).toEqual([
      expect.objectContaining({ inventoryItemId: 1, requiredQty: 7, unit: "piece" }),
    ]);
  });

  it("returns the proven snapshot without a second line or audit", async () => {
    seedOrder();
    await publishedFactory();
    const first = await manager().bomRules.createOrderSnapshot({ orderId: 7 });
    const audits = state.audits.length;
    const lines = state.lines.length;
    const second = await manager().bomRules.createOrderSnapshot({ orderId: 7 });
    expect(second).toMatchObject({ created: false, snapshotId: first.snapshotId });
    expect(second.lines).toHaveLength(first.lines.length);
    expect(state.audits).toHaveLength(audits);
    expect(state.lines).toHaveLength(lines);
    expect(state.snapshots).toHaveLength(1);
  });

  it("conflicts when a snapshot has no matching audit", async () => {
    seedOrder();
    await publishedFactory();
    state.snapshots.push({
      id: 50,
      doorOrderId: 7,
      canonicalNumber: "SD-2026-000007",
      ruleSetId: 1,
      lineageCode: "factory-door",
      ruleSetVersion: 1,
      createdByStaffUserId: 22,
      createdAt: 1,
    });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.snapshots).toHaveLength(1);
    expect(state.lines).toHaveLength(0);
  });

  it("rolls back lines and audit when a later line insert fails", async () => {
    seedOrder();
    await publishedFactory();
    const auditsBefore = state.audits.length;
    state.lineInserts = 0;
    state.failLineInsertAt = 2;
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toThrow(
      "forced line failure"
    );
    expect(state.snapshots).toHaveLength(0);
    expect(state.lines).toHaveLength(0);
    expect(state.audits).toHaveLength(auditsBefore);
    expect(state.items.get(1)?.currentQty).toBe(80);
  });

  it("rolls back the snapshot when the audit insert fails", async () => {
    seedOrder();
    await publishedFactory();
    const auditsBefore = state.audits.length;
    state.failAuditEvent = "order.bom_snapshot.created";
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toThrow(
      "forced audit failure"
    );
    expect(state.snapshots).toHaveLength(0);
    expect(state.lines).toHaveLength(0);
    expect(state.audits).toHaveLength(auditsBefore);
    expect(state.orders.get(7)?.commercialStatus).toBe("approved");
    expect(state.orders.get(7)?.materialState).toBe("pending_materials");
  });

  it("rejects fractional, zero, negative, unsafe, and missing-material results", async () => {
    seedItem(1, "piece", 15);
    seedOrder({ dimensions: { width: 10.5 }, totalDoors: 2, selections: {} });
    const fractional = await draftWithRules([
      { kind: "linear_dimension", inventoryItemId: 1, quantity: 1, dimensionKey: "width" },
    ]);
    await admin().bomRules.publish({ ruleSetId: fractional.ruleSetId });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.snapshots).toHaveLength(0);

    expect(() =>
      evaluateBomRules(
        [
          {
            id: 1,
            sortOrder: 1,
            enabled: true,
            kind: "fixed_per_order",
            inventoryItemId: 1,
            quantity: 0,
            dimensionKey: null,
            secondaryDimensionKey: null,
            selectionKey: null,
            selectionValue: null,
            appliesPer: null,
            wasteNumerator: 0,
            wasteDenominator: 1,
            expectedUnit: "piece",
          },
        ],
        { productId: "interior-door", totalDoors: 1, selections: {}, dimensions: {} },
        new Map([[1, "piece"]])
      )
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));

    await expect(
      admin().bomRules.setRules({
        ruleSetId: fractional.ruleSetId,
        rules: [{ kind: "fixed_per_order", inventoryItemId: 1, quantity: 0 }],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin().bomRules.setRules({
        ruleSetId: fractional.ruleSetId,
        rules: [{ kind: "fixed_per_order", inventoryItemId: 1, quantity: -3 }],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    state.rules[0]!.quantity = 3;
    state.rules[0]!.kind = "fixed_per_order";
    state.rules[0]!.wasteNumerator = 1;
    state.rules[0]!.wasteDenominator = 2;
    seedOrder({ dimensions: {}, selections: {} });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    state.rules[0]!.wasteNumerator = 0;
    state.rules[0]!.wasteDenominator = 1;
    state.rules[0]!.quantity = MAX_BOM_QUANTITY;
    state.rules[0]!.kind = "fixed_per_door";
    seedOrder({ totalDoors: 2, dimensions: {}, selections: {} });
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    state.rules[0]!.quantity = 1;
    state.rules[0]!.kind = "fixed_per_order";
    state.items.delete(1);
    seedOrder();
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.snapshots).toHaveLength(0);
    expect(state.lines).toHaveLength(0);
    expect(state.audits.some((row) => row.eventType === "order.bom_snapshot.created")).toBe(false);
    expect(rejectBomSnapshotMutation).toThrow(expect.objectContaining({ code: "CONFLICT" }));
    expect(rejectBomSnapshotLineMutation).toThrow(expect.objectContaining({ code: "CONFLICT" }));
  });
});

describe("BOM lineage scope and frozen units", () => {
  const storedRule = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    sortOrder: 1,
    enabled: true,
    kind: "fixed_per_order" as const,
    inventoryItemId: 1,
    quantity: 1,
    dimensionKey: null,
    secondaryDimensionKey: null,
    selectionKey: null,
    selectionValue: null,
    appliesPer: null,
    wasteNumerator: 0,
    wasteDenominator: 1,
    expectedUnit: "piece",
    ...overrides,
  });

  it("keeps scope on the lineage and copies it to the next version", async () => {
    seedItem(1, "cm");
    const created = await admin().bomRules.createDraft({
      lineageCode: "fire-line",
      name: "Fire",
      productId: "fire-door",
    });
    expect(created).toMatchObject({ scopeKey: "product:fire-door" });
    expect(bomLineageScope("fire-door").scopeKey).toBe("product:fire-door");
    expect(bomLineageScope(null).scopeKey).toBe("factory");
    await admin().bomRules.setRules({
      ruleSetId: created.ruleSetId,
      rules: [{ kind: "fixed_per_order", inventoryItemId: 1, quantity: 2 }],
    });
    expect(state.rules[0]).toMatchObject({ expectedUnit: "cm" });
    await admin().bomRules.publish({ ruleSetId: created.ruleSetId });
    const next = await admin().bomRules.createNextVersion({ ruleSetId: created.ruleSetId });
    expect(state.ruleSets.find((row) => row.id === next.ruleSetId)).toMatchObject({
      lineageId: state.lineages[0]?.id,
      version: 2,
    });
    expect(state.lineages).toEqual([
      expect.objectContaining({
        lineageCode: "fire-line",
        scopeKind: "product",
        productId: "fire-door",
        scopeKey: "product:fire-door",
      }),
    ]);
    expect(state.rules.filter((row) => row.ruleSetId === next.ruleSetId)[0]).toMatchObject({
      expectedUnit: "cm",
    });
    await expect(
      admin().bomRules.updateDraft({
        ruleSetId: next.ruleSetId,
        name: "Renamed",
        productId: "other",
      } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      admin().bomRules.createDraft({
        lineageCode: "another-fire",
        name: "Other fire",
        productId: "fire-door",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.lineages).toHaveLength(1);
  });

  it("rejects a second product lineage for the same product", async () => {
    seedItem(1);
    await admin().bomRules.createDraft({
      lineageCode: "product-a",
      name: "A",
      productId: "interior-door",
    });
    await expect(
      admin().bomRules.createDraft({
        lineageCode: "product-b",
        name: "B",
        productId: "interior-door",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.lineages).toHaveLength(1);
  });

  it("fails publish and snapshot when the inventory unit drifts", async () => {
    seedItem(1, "cm", 20);
    seedOrder({ dimensions: {}, selections: {}, totalDoors: 1 });
    const created = await draftWithRules([
      { kind: "fixed_per_order", inventoryItemId: 1, quantity: 2 },
    ]);
    state.items.get(1)!.unit = "mm";
    await expect(admin().bomRules.publish({ ruleSetId: created.ruleSetId })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.ruleSets[0]).toMatchObject({ status: "draft" });
    expect(state.audits).toHaveLength(0);
    state.items.get(1)!.unit = "cm";
    await admin().bomRules.publish({ ruleSetId: created.ruleSetId });
    state.items.get(1)!.unit = "mm";
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.snapshots).toHaveLength(0);
    expect(state.lines).toHaveLength(0);
    expect(state.audits.some((row) => row.eventType === "order.bom_snapshot.created")).toBe(false);
    expect(state.items.get(1)?.currentQty).toBe(20);
  });

  it("rejects an order whose persisted selections are not an object", async () => {
    seedItem(1, "piece");
    seedOrder({ selections: {} });
    const created = await draftWithRules([
      { kind: "fixed_per_order", inventoryItemId: 1, quantity: 1 },
    ]);
    await admin().bomRules.publish({ ruleSetId: created.ruleSetId });
    state.orders.get(7)!.selections = null as unknown as Record<string, string>;
    await expect(manager().bomRules.createOrderSnapshot({ orderId: 7 })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(state.snapshots).toHaveLength(0);
    expect(state.audits.some((row) => row.eventType === "order.bom_snapshot.created")).toBe(false);
  });

  it("evaluates area, exact waste, missing dimensions, and invalid selections", () => {
    const config = {
      productId: "interior-door",
      totalDoors: 2,
      selections: { hinge: "concealed" },
      dimensions: { width: 3, height: 4 },
    };
    const lines = evaluateBomRules(
      [
        storedRule({
          kind: "area_dimensions",
          quantity: 2,
          dimensionKey: "width",
          secondaryDimensionKey: "height",
          expectedUnit: "cm",
        }),
      ],
      config,
      new Map([[1, "cm"]])
    );
    expect(lines).toEqual([expect.objectContaining({ requiredQty: 24, unit: "cm" })]);
    expect(() =>
      evaluateBomRules(
        [storedRule({ quantity: 3, wasteNumerator: 1, wasteDenominator: 2 })],
        { ...config, dimensions: {} },
        new Map([[1, "piece"]])
      )
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));
    expect(() =>
      evaluateBomRules(
        [storedRule({ kind: "linear_dimension", dimensionKey: "width", expectedUnit: "cm" })],
        { ...config, dimensions: {} },
        new Map([[1, "cm"]])
      )
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));
    expect(conflictFromDatabaseError({ errno: 1062 })).toMatchObject({ code: "CONFLICT" });
    expect(conflictFromDatabaseError({ cause: { code: "ER_LOCK_DEADLOCK" } })).toMatchObject({
      code: "CONFLICT",
    });
  });
});
