import { and, asc, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema.js";

/**
 * Versioned BOM rules and the immutable order snapshot.
 *
 * Supported rule kinds produce a positive integer in the inventory item's
 * counting unit:
 * - fixed_per_order
 * - fixed_per_door (coefficient × persisted totalDoors)
 * - linear_dimension (integer dimension × coefficient)
 * - area_dimensions (integer width × integer height × coefficient)
 * - when_selection (one persisted selection equality, then per order or per door)
 *
 * Waste is a rational allowance on the rule (numerator / denominator).
 * The result must divide exactly. Fractional results are rejected.
 *
 * Unsupported in this version, and intentionally not executable:
 * - manual_component
 * - sub_selection conditions
 * - purchasing-unit or pack-size conversion
 * - arbitrary expression strings
 *
 * There is no eval and no caller-supplied formula.
 * Snapshot generation reads the stored order. It does not mutate inventory,
 * commercial status, material state, or the canonical number.
 *
 * Lineage scope is immutable and is not stored on a version:
 * - factory-wide scope_key is "factory"
 * - product scope_key is "product:" plus the exact product id
 * scope_key is unique and never null, so one lineage owns each scope.
 * An order uses the latest published version of its product lineage when one
 * is published, otherwise the latest published factory lineage.
 */

export const BOM_RULE_KINDS = [
  "fixed_per_order",
  "fixed_per_door",
  "linear_dimension",
  "area_dimensions",
  "when_selection",
] as const;

export type BomRuleKind = (typeof BOM_RULE_KINDS)[number];

export const UNSUPPORTED_BOM_RULE_KINDS = [
  "manual_component",
  "sub_selection",
  "purchasing_unit_conversion",
  "expression",
] as const;

export const MAX_BOM_QUANTITY = 1_000_000_000;

export const BOM_RULE_SET_PUBLISHED_EVENT = "bom.rule_set.published";
export const BOM_SNAPSHOT_CREATED_EVENT = "order.bom_snapshot.created";
export const FACTORY_SCOPE_KEY = "factory";

export type BomLineageScope = {
  scopeKind: "factory" | "product";
  productId: string | null;
  scopeKey: string;
};

/** Scope identity for a lineage. Factory and product keys cannot collide. */
export function bomLineageScope(productId: string | null): BomLineageScope {
  if (!productId) {
    return { scopeKind: "factory", productId: null, scopeKey: FACTORY_SCOPE_KEY };
  }
  return { scopeKind: "product", productId, scopeKey: `product:${productId}` };
}

export function isDeadlockError(error: unknown): boolean {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as { errno?: unknown; code?: unknown; message?: unknown; cause?: unknown };
    const errno = typeof record.errno === "number" ? record.errno : null;
    const code = typeof record.code === "string" ? record.code : "";
    const message = typeof record.message === "string" ? record.message : "";
    if (errno === 1213 || code === "ER_LOCK_DEADLOCK" || message.includes("Deadlock found")) {
      return true;
    }
    if ("cause" in record) queue.push(record.cause);
  }
  return false;
}

export function conflictFromDatabaseError(error: unknown): BomDomainError | null {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as { errno?: unknown; code?: unknown; message?: unknown; cause?: unknown };
    const errno = typeof record.errno === "number" ? record.errno : null;
    const code = typeof record.code === "string" ? record.code : "";
    const message = typeof record.message === "string" ? record.message : "";
    if (
      errno === 1062 ||
      errno === 1213 ||
      code === "ER_DUP_ENTRY" ||
      code === "ER_LOCK_DEADLOCK" ||
      message.includes("Duplicate entry") ||
      message.includes("Deadlock found")
    ) {
      return new BomDomainError("CONFLICT", "تعارض في نطاق أو نسخة قواعد المواد");
    }
    if ("cause" in record) queue.push(record.cause);
  }
  return null;
}

const SAFE_CONFIG_KEY = /^(?!__)[A-Za-z][A-Za-z0-9_]{0,63}$/;

export class BomDomainError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT";

  constructor(code: "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "BomDomainError";
    this.code = code;
  }
}

export type BomTx = Pick<
  MySql2Database<typeof schema>,
  "insert" | "select" | "update" | "delete"
>;

export type BomRuleDraft = {
  inventoryItemId: number;
  enabled: boolean;
  kind: BomRuleKind;
  quantity: number;
  dimensionKey: string | null;
  secondaryDimensionKey: string | null;
  selectionKey: string | null;
  selectionValue: string | null;
  appliesPer: "order" | "door" | null;
  wasteNumerator: number;
  wasteDenominator: number;
};

export type BomSnapshotLineView = {
  id: number;
  lineNumber: number;
  ruleId: number;
  inventoryItemId: number;
  requiredQty: number;
  unit: string;
};

export type BomSnapshotResult = {
  created: boolean;
  snapshotId: number;
  orderId: number;
  canonicalNumber: string;
  ruleSetId: number;
  lineageCode: string;
  ruleSetVersion: number;
  lines: BomSnapshotLineView[];
};

type OrderConfiguration = {
  productId: string;
  totalDoors: number;
  selections: Record<string, string>;
  dimensions: Record<string, unknown>;
};

type StoredRule = BomRuleDraft & { id: number; sortOrder: number; expectedUnit: string };

type ComputedLine = {
  ruleId: number;
  inventoryItemId: number;
  requiredQty: number;
  unit: string;
};

function insertIdOf(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number((header as { insertId?: number } | undefined)?.insertId);
  return Number.isInteger(insertId) && insertId > 0 ? insertId : 0;
}

function requireActor(actorStaffUserId: number): void {
  if (!Number.isInteger(actorStaffUserId) || actorStaffUserId <= 0) {
    throw new BomDomainError("CONFLICT", "هوية الموظف غير صالحة");
  }
}

function requirePositiveQuantity(value: number, message: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new BomDomainError("CONFLICT", message);
  }
  if (value <= 0 || value > MAX_BOM_QUANTITY) {
    throw new BomDomainError("CONFLICT", message);
  }
  return value;
}

function multiplyExact(left: number, right: number): number {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
    throw new BomDomainError("CONFLICT", "كمية المواد خارج الحد الآمن");
  }
  const product = left * right;
  if (!Number.isSafeInteger(product) || product > MAX_BOM_QUANTITY) {
    throw new BomDomainError("CONFLICT", "كمية المواد خارج الحد الآمن");
  }
  return product;
}

function assertConfigKey(key: string | null, label: string): string {
  if (!key || !SAFE_CONFIG_KEY.test(key)) {
    throw new BomDomainError("CONFLICT", label);
  }
  return key;
}

export function assertDraftRule(rule: BomRuleDraft): void {
  requirePositiveQuantity(rule.quantity, "معامل القاعدة يجب أن يكون عدداً صحيحاً موجباً");
  if (
    !Number.isInteger(rule.wasteNumerator) ||
    rule.wasteNumerator < 0 ||
    rule.wasteNumerator > MAX_BOM_QUANTITY ||
    !Number.isInteger(rule.wasteDenominator) ||
    rule.wasteDenominator <= 0 ||
    rule.wasteDenominator > 1_000_000
  ) {
    throw new BomDomainError("CONFLICT", "هدر القاعدة غير صالح");
  }
  if (!Number.isInteger(rule.inventoryItemId) || rule.inventoryItemId <= 0) {
    throw new BomDomainError("CONFLICT", "المادة الخام المطلوبة غير موجودة");
  }
  if (rule.kind === "fixed_per_order" || rule.kind === "fixed_per_door") {
    return;
  }
  if (rule.kind === "linear_dimension") {
    assertConfigKey(rule.dimensionKey, "مفتاح البعد غير صالح");
    return;
  }
  if (rule.kind === "area_dimensions") {
    assertConfigKey(rule.dimensionKey, "مفتاح البعد غير صالح");
    assertConfigKey(rule.secondaryDimensionKey, "مفتاح البعد غير صالح");
    return;
  }
  if (rule.kind === "when_selection") {
    assertConfigKey(rule.selectionKey, "مفتاح الاختيار غير صالح");
    if (!rule.selectionValue || rule.selectionValue.length > 255) {
      throw new BomDomainError("CONFLICT", "قيمة الاختيار غير صالحة");
    }
    if (rule.appliesPer !== "order" && rule.appliesPer !== "door") {
      throw new BomDomainError("CONFLICT", "نطاق القاعدة غير صالح");
    }
    return;
  }
  throw new BomDomainError("CONFLICT", "نوع قاعدة المواد غير مدعوم");
}

function applyWaste(base: number, numerator: number, denominator: number): number {
  const safeBase = requirePositiveQuantity(base, "كمية المواد يجب أن تكون عدداً صحيحاً موجباً");
  if (numerator === 0) return safeBase;
  const scaled = multiplyExact(safeBase, numerator);
  if (scaled % denominator !== 0) {
    throw new BomDomainError("CONFLICT", "كمية المواد يجب أن تكون عدداً صحيحاً موجباً");
  }
  const total = safeBase + scaled / denominator;
  return requirePositiveQuantity(total, "كمية المواد يجب أن تكون عدداً صحيحاً موجباً");
}

function readSelections(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BomDomainError("CONFLICT", "تكوين الطلب غير صالح");
  }
  const selections: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!SAFE_CONFIG_KEY.test(key) || typeof entry !== "string") {
      throw new BomDomainError("CONFLICT", "تكوين الطلب غير صالح");
    }
    selections[key] = entry;
  }
  return selections;
}

function readDimensions(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new BomDomainError("CONFLICT", "تكوين الطلب غير صالح");
  }
  return value as Record<string, unknown>;
}

function readOrderConfiguration(order: {
  productId: string;
  totalDoors: number | null;
  selections: unknown;
  dimensions: unknown;
}): OrderConfiguration {
  if (typeof order.productId !== "string" || order.productId.trim() === "") {
    throw new BomDomainError("CONFLICT", "تكوين الطلب غير صالح");
  }
  if (
    order.totalDoors == null ||
    !Number.isInteger(order.totalDoors) ||
    order.totalDoors <= 0 ||
    order.totalDoors > MAX_BOM_QUANTITY
  ) {
    throw new BomDomainError("CONFLICT", "تكوين الطلب غير صالح");
  }
  return {
    productId: order.productId,
    totalDoors: order.totalDoors,
    selections: readSelections(order.selections),
    dimensions: readDimensions(order.dimensions),
  };
}

function readCountingDimension(dimensions: Record<string, unknown>, key: string): number {
  const safeKey = assertConfigKey(key, "تكوين الطلب غير صالح");
  if (!Object.prototype.hasOwnProperty.call(dimensions, safeKey)) {
    throw new BomDomainError("CONFLICT", "تكوين الطلب غير صالح");
  }
  const value = dimensions[safeKey];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new BomDomainError("CONFLICT", "كمية المواد يجب أن تكون عدداً صحيحاً موجباً");
  }
  return requirePositiveQuantity(value, "كمية المواد يجب أن تكون عدداً صحيحاً موجباً");
}

function baseQuantity(rule: StoredRule, config: OrderConfiguration): number | null {
  if (rule.kind === "fixed_per_order") return rule.quantity;
  if (rule.kind === "fixed_per_door") return multiplyExact(rule.quantity, config.totalDoors);
  if (rule.kind === "linear_dimension") {
    const dimension = readCountingDimension(config.dimensions, rule.dimensionKey ?? "");
    return multiplyExact(dimension, rule.quantity);
  }
  if (rule.kind === "area_dimensions") {
    const width = readCountingDimension(config.dimensions, rule.dimensionKey ?? "");
    const height = readCountingDimension(config.dimensions, rule.secondaryDimensionKey ?? "");
    return multiplyExact(multiplyExact(width, height), rule.quantity);
  }
  if (rule.kind === "when_selection") {
    const key = rule.selectionKey ?? "";
    if (!Object.prototype.hasOwnProperty.call(config.selections, key)) return null;
    if (config.selections[key] !== rule.selectionValue) return null;
    if (rule.appliesPer === "door") return multiplyExact(rule.quantity, config.totalDoors);
    return rule.quantity;
  }
  throw new BomDomainError("CONFLICT", "نوع قاعدة المواد غير مدعوم");
}

export function evaluateBomRules(
  rules: StoredRule[],
  config: OrderConfiguration,
  unitsByItemId: ReadonlyMap<number, string>
): ComputedLine[] {
  const ordered = [...rules].sort((left, right) => left.sortOrder - right.sortOrder);
  const lines: ComputedLine[] = [];
  for (const rule of ordered) {
    assertDraftRule(rule);
    if (!rule.enabled) continue;
    const base = baseQuantity(rule, config);
    if (base == null) continue;
    const requiredQty = applyWaste(base, rule.wasteNumerator, rule.wasteDenominator);
    const currentUnit = unitsByItemId.get(rule.inventoryItemId);
    if (currentUnit == null) {
      throw new BomDomainError("CONFLICT", "المادة الخام المطلوبة غير موجودة");
    }
    if (currentUnit.trim() === "" || rule.expectedUnit.trim() === "") {
      throw new BomDomainError("CONFLICT", "وحدة حساب المادة غير صالحة");
    }
    if (currentUnit !== rule.expectedUnit) {
      throw new BomDomainError("CONFLICT", "وحدة حساب المادة تغيرت وتحتاج نسخة قواعد جديدة");
    }
    lines.push({
      ruleId: rule.id,
      inventoryItemId: rule.inventoryItemId,
      requiredQty,
      unit: rule.expectedUnit,
    });
  }
  if (lines.length === 0) {
    throw new BomDomainError("CONFLICT", "قواعد المواد لم تنتج أي متطلبات");
  }
  return lines;
}

async function lockRuleSet(tx: BomTx, ruleSetId: number) {
  const [row] = await tx
    .select({
      id: schema.bomRuleSets.id,
      lineageId: schema.bomRuleSets.lineageId,
      name: schema.bomRuleSets.name,
      version: schema.bomRuleSets.version,
      status: schema.bomRuleSets.status,
    })
    .from(schema.bomRuleSets)
    .where(eq(schema.bomRuleSets.id, ruleSetId))
    .for("update")
    .limit(1);
  if (!row) throw new BomDomainError("NOT_FOUND", "مجموعة قواعد المواد غير موجودة");
  return row;
}

async function lockLineage(tx: BomTx, lineageId: number) {
  const [row] = await tx
    .select({
      id: schema.bomLineages.id,
      lineageCode: schema.bomLineages.lineageCode,
      scopeKind: schema.bomLineages.scopeKind,
      productId: schema.bomLineages.productId,
      scopeKey: schema.bomLineages.scopeKey,
    })
    .from(schema.bomLineages)
    .where(eq(schema.bomLineages.id, lineageId))
    .for("update")
    .limit(1);
  if (!row) throw new BomDomainError("NOT_FOUND", "سلالة قواعد المواد غير موجودة");
  return row;
}

function assertDraft(status: string): void {
  if (status !== "draft") {
    throw new BomDomainError("CONFLICT", "قواعد المواد المنشورة ثابتة ولا تُعدَّل");
  }
}

async function loadItemUnits(tx: BomTx, itemIds: number[]): Promise<Map<number, string>> {
  const units = new Map<number, string>();
  for (const itemId of [...new Set(itemIds)]) {
    const [row] = await tx
      .select({ id: schema.inventoryItems.id, unit: schema.inventoryItems.unit })
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, itemId))
      .limit(1);
    if (!row || row.unit.trim() === "") {
      throw new BomDomainError("CONFLICT", "المادة الخام المطلوبة غير موجودة");
    }
    units.set(row.id, row.unit);
  }
  return units;
}

async function throwIfDuplicate(error: unknown, message: string): Promise<never> {
  const conflict = conflictFromDatabaseError(error);
  if (conflict) throw new BomDomainError("CONFLICT", message);
  throw error;
}

async function loadRules(tx: BomTx, ruleSetId: number): Promise<StoredRule[]> {
  const rows = await tx
    .select({
      id: schema.bomRules.id,
      inventoryItemId: schema.bomRules.inventoryItemId,
      sortOrder: schema.bomRules.sortOrder,
      enabled: schema.bomRules.enabled,
      kind: schema.bomRules.kind,
      quantity: schema.bomRules.quantity,
      dimensionKey: schema.bomRules.dimensionKey,
      secondaryDimensionKey: schema.bomRules.secondaryDimensionKey,
      selectionKey: schema.bomRules.selectionKey,
      selectionValue: schema.bomRules.selectionValue,
      appliesPer: schema.bomRules.appliesPer,
      wasteNumerator: schema.bomRules.wasteNumerator,
      wasteDenominator: schema.bomRules.wasteDenominator,
      expectedUnit: schema.bomRules.expectedUnit,
    })
    .from(schema.bomRules)
    .where(eq(schema.bomRules.ruleSetId, ruleSetId))
    .orderBy(asc(schema.bomRules.sortOrder));
  return rows.map((row) => ({
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    sortOrder: row.sortOrder,
    enabled: row.enabled,
    kind: row.kind,
    quantity: row.quantity,
    dimensionKey: row.dimensionKey,
    secondaryDimensionKey: row.secondaryDimensionKey,
    selectionKey: row.selectionKey,
    selectionValue: row.selectionValue,
    appliesPer: row.appliesPer,
    wasteNumerator: row.wasteNumerator,
    wasteDenominator: row.wasteDenominator,
    expectedUnit: row.expectedUnit,
  }));
}

export async function createDraftBomRuleSet(
  tx: BomTx,
  input: { lineageCode: string; name: string; productId: string | null },
  actorStaffUserId: number,
  now = Date.now()
): Promise<{ ruleSetId: number; version: number; lineageId: number; scopeKey: string }> {
  requireActor(actorStaffUserId);
  const lineageCode = input.lineageCode.trim();
  const name = input.name.trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(lineageCode) || name.length === 0 || name.length > 255) {
    throw new BomDomainError("CONFLICT", "تعريف مجموعة القواعد غير صالح");
  }
  const productId = input.productId?.trim() || null;
  if (productId && productId.length > 100) {
    throw new BomDomainError("CONFLICT", "تعريف مجموعة القواعد غير صالح");
  }
  const scope = bomLineageScope(productId);
  const [sameCode] = await tx
    .select({ id: schema.bomLineages.id })
    .from(schema.bomLineages)
    .where(eq(schema.bomLineages.lineageCode, lineageCode))
    .for("update")
    .limit(1);
  if (sameCode) {
    throw new BomDomainError("CONFLICT", "مجموعة القواعد موجودة وتحتاج نسخة جديدة");
  }
  const [sameScope] = await tx
    .select({ id: schema.bomLineages.id })
    .from(schema.bomLineages)
    .where(eq(schema.bomLineages.scopeKey, scope.scopeKey))
    .for("update")
    .limit(1);
  if (sameScope) {
    throw new BomDomainError("CONFLICT", "نطاق قواعد المواد مملوك لسلالة أخرى");
  }
  let lineageId = 0;
  try {
    const lineageInsert = await tx.insert(schema.bomLineages).values({
      lineageCode,
      scopeKind: scope.scopeKind,
      productId: scope.productId,
      scopeKey: scope.scopeKey,
      createdByStaffUserId: actorStaffUserId,
      createdAt: now,
    });
    lineageId = insertIdOf(lineageInsert);
  } catch (error) {
    await throwIfDuplicate(error, "نطاق قواعد المواد مملوك لسلالة أخرى");
  }
  if (lineageId <= 0) throw new BomDomainError("CONFLICT", "تعذر إنشاء سلالة القواعد");
  let ruleSetId = 0;
  try {
    const inserted = await tx.insert(schema.bomRuleSets).values({
      lineageId,
      name,
      version: 1,
      status: "draft",
      createdByStaffUserId: actorStaffUserId,
      publishedByStaffUserId: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    ruleSetId = insertIdOf(inserted);
  } catch (error) {
    await throwIfDuplicate(error, "تعارض في نطاق أو نسخة قواعد المواد");
  }
  if (ruleSetId <= 0) throw new BomDomainError("CONFLICT", "تعذر إنشاء مجموعة القواعد");
  return { ruleSetId, version: 1, lineageId, scopeKey: scope.scopeKey };
}

export async function updateDraftBomRuleSet(
  tx: BomTx,
  ruleSetId: number,
  input: { name: string },
  actorStaffUserId: number,
  now = Date.now()
): Promise<{ ruleSetId: number }> {
  requireActor(actorStaffUserId);
  const row = await lockRuleSet(tx, ruleSetId);
  assertDraft(row.status);
  const name = input.name.trim();
  if (name.length === 0 || name.length > 255) {
    throw new BomDomainError("CONFLICT", "تعريف مجموعة القواعد غير صالح");
  }
  await tx
    .update(schema.bomRuleSets)
    .set({ name, updatedAt: now })
    .where(eq(schema.bomRuleSets.id, row.id));
  return { ruleSetId: row.id };
}

export async function setDraftBomRules(
  tx: BomTx,
  ruleSetId: number,
  rules: BomRuleDraft[],
  actorStaffUserId: number,
  now = Date.now()
): Promise<{ ruleCount: number }> {
  requireActor(actorStaffUserId);
  const row = await lockRuleSet(tx, ruleSetId);
  assertDraft(row.status);
  if (rules.length === 0 || rules.length > 200) {
    throw new BomDomainError("CONFLICT", "قواعد المواد غير صالحة");
  }
  rules.forEach(assertDraftRule);
  const units = await loadItemUnits(
    tx,
    rules.map((rule) => rule.inventoryItemId)
  );
  await tx.delete(schema.bomRules).where(eq(schema.bomRules.ruleSetId, row.id));
  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index]!;
    const expectedUnit = units.get(rule.inventoryItemId);
    if (!expectedUnit) {
      throw new BomDomainError("CONFLICT", "المادة الخام المطلوبة غير موجودة");
    }
    await tx.insert(schema.bomRules).values({
      ruleSetId: row.id,
      inventoryItemId: rule.inventoryItemId,
      sortOrder: index + 1,
      enabled: rule.enabled,
      kind: rule.kind,
      quantity: rule.quantity,
      dimensionKey: rule.dimensionKey,
      secondaryDimensionKey: rule.secondaryDimensionKey,
      selectionKey: rule.selectionKey,
      selectionValue: rule.selectionValue,
      appliesPer: rule.appliesPer,
      wasteNumerator: rule.wasteNumerator,
      wasteDenominator: rule.wasteDenominator,
      expectedUnit,
      createdAt: now,
    });
  }
  await tx
    .update(schema.bomRuleSets)
    .set({ updatedAt: now })
    .where(eq(schema.bomRuleSets.id, row.id));
  return { ruleCount: rules.length };
}

export async function publishBomRuleSet(
  tx: BomTx,
  ruleSetId: number,
  actorStaffUserId: number,
  now = Date.now()
): Promise<{ ruleSetId: number; version: number; lineageCode: string }> {
  requireActor(actorStaffUserId);
  const row = await lockRuleSet(tx, ruleSetId);
  assertDraft(row.status);
  const rules = await loadRules(tx, row.id);
  if (!rules.some((rule) => rule.enabled)) {
    throw new BomDomainError("CONFLICT", "لا يمكن نشر مجموعة قواعد فارغة");
  }
  rules.forEach(assertDraftRule);
  const lineage = await lockLineage(tx, row.lineageId);
  const units = await loadItemUnits(
    tx,
    rules.map((rule) => rule.inventoryItemId)
  );
  for (const rule of rules) {
    if (units.get(rule.inventoryItemId) !== rule.expectedUnit) {
      throw new BomDomainError("CONFLICT", "وحدة حساب المادة تغيرت وتحتاج نسخة قواعد جديدة");
    }
  }
  await tx
    .update(schema.bomRuleSets)
    .set({
      status: "published",
      publishedByStaffUserId: actorStaffUserId,
      publishedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.bomRuleSets.id, row.id));
  await tx.insert(schema.auditEvents).values({
    eventType: BOM_RULE_SET_PUBLISHED_EVENT,
    entityType: "bom_rule_set",
    entityId: row.id,
    canonicalNumber: null,
    actorStaffUserId,
    occurredAt: now,
    beforeJson: {
      status: "draft",
      lineageCode: lineage.lineageCode,
      scopeKey: lineage.scopeKey,
      version: row.version,
    },
    afterJson: {
      status: "published",
      lineageCode: lineage.lineageCode,
      scopeKey: lineage.scopeKey,
      version: row.version,
      ruleCount: rules.length,
    },
  });
  return { ruleSetId: row.id, version: row.version, lineageCode: lineage.lineageCode };
}

export async function createNextBomRuleVersion(
  tx: BomTx,
  sourceRuleSetId: number,
  actorStaffUserId: number,
  now = Date.now()
): Promise<{ ruleSetId: number; version: number }> {
  requireActor(actorStaffUserId);
  const source = await lockRuleSet(tx, sourceRuleSetId);
  if (source.status !== "published") {
    throw new BomDomainError("CONFLICT", "النسخة التالية تُنشأ من نسخة منشورة");
  }
  await lockLineage(tx, source.lineageId);
  const family = await tx
    .select({
      id: schema.bomRuleSets.id,
      version: schema.bomRuleSets.version,
      status: schema.bomRuleSets.status,
    })
    .from(schema.bomRuleSets)
    .where(eq(schema.bomRuleSets.lineageId, source.lineageId))
    .for("update");
  if (family.some((entry) => entry.status === "draft")) {
    throw new BomDomainError("CONFLICT", "توجد مسودة مفتوحة لهذه القواعد");
  }
  const nextVersion = Math.max(...family.map((entry) => entry.version)) + 1;
  let ruleSetId = 0;
  try {
    const inserted = await tx.insert(schema.bomRuleSets).values({
      lineageId: source.lineageId,
      name: source.name,
      version: nextVersion,
      status: "draft",
      createdByStaffUserId: actorStaffUserId,
      publishedByStaffUserId: null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    ruleSetId = insertIdOf(inserted);
  } catch (error) {
    await throwIfDuplicate(error, "توجد مسودة مفتوحة لهذه القواعد");
  }
  if (ruleSetId <= 0) throw new BomDomainError("CONFLICT", "تعذر إنشاء نسخة القواعد");
  const rules = await loadRules(tx, source.id);
  for (const rule of rules) {
    await tx.insert(schema.bomRules).values({
      ruleSetId,
      inventoryItemId: rule.inventoryItemId,
      sortOrder: rule.sortOrder,
      enabled: rule.enabled,
      kind: rule.kind,
      quantity: rule.quantity,
      dimensionKey: rule.dimensionKey,
      secondaryDimensionKey: rule.secondaryDimensionKey,
      selectionKey: rule.selectionKey,
      selectionValue: rule.selectionValue,
      appliesPer: rule.appliesPer,
      wasteNumerator: rule.wasteNumerator,
      wasteDenominator: rule.wasteDenominator,
      expectedUnit: rule.expectedUnit,
      createdAt: now,
    });
  }
  return { ruleSetId, version: nextVersion };
}

async function latestPublishedForScope(tx: BomTx, scopeKey: string) {
  const [lineage] = await tx
    .select({
      id: schema.bomLineages.id,
      lineageCode: schema.bomLineages.lineageCode,
      scopeKey: schema.bomLineages.scopeKey,
    })
    .from(schema.bomLineages)
    .where(eq(schema.bomLineages.scopeKey, scopeKey))
    .limit(1);
  if (!lineage) return null;
  const [version] = await tx
    .select({
      id: schema.bomRuleSets.id,
      version: schema.bomRuleSets.version,
      status: schema.bomRuleSets.status,
    })
    .from(schema.bomRuleSets)
    .where(
      and(eq(schema.bomRuleSets.lineageId, lineage.id), eq(schema.bomRuleSets.status, "published"))
    )
    .orderBy(desc(schema.bomRuleSets.version))
    .limit(1);
  if (!version || version.status !== "published") return null;
  return {
    id: version.id,
    version: version.version,
    lineageCode: lineage.lineageCode,
    scopeKey: lineage.scopeKey,
  };
}

async function selectApplicablePublished(tx: BomTx, productId: string) {
  const specific = await latestPublishedForScope(tx, bomLineageScope(productId).scopeKey);
  if (specific) return specific;
  const factory = await latestPublishedForScope(tx, FACTORY_SCOPE_KEY);
  if (!factory) {
    throw new BomDomainError("CONFLICT", "لا توجد نسخة منشورة من قواعد المواد");
  }
  return factory;
}

function snapshotIdFromAudit(afterJson: unknown): number | null {
  if (!afterJson || typeof afterJson !== "object" || Array.isArray(afterJson)) return null;
  const snapshotId = Number((afterJson as { snapshotId?: unknown }).snapshotId);
  return Number.isInteger(snapshotId) && snapshotId > 0 ? snapshotId : null;
}

async function loadSnapshotLines(tx: BomTx, snapshotId: number): Promise<BomSnapshotLineView[]> {
  const rows = await tx
    .select({
      id: schema.bomSnapshotLines.id,
      lineNumber: schema.bomSnapshotLines.lineNumber,
      ruleId: schema.bomSnapshotLines.ruleId,
      inventoryItemId: schema.bomSnapshotLines.inventoryItemId,
      requiredQty: schema.bomSnapshotLines.requiredQty,
      unit: schema.bomSnapshotLines.unit,
    })
    .from(schema.bomSnapshotLines)
    .where(eq(schema.bomSnapshotLines.snapshotId, snapshotId))
    .orderBy(asc(schema.bomSnapshotLines.lineNumber));
  return rows;
}

export async function createOrderBomSnapshot(
  tx: BomTx,
  orderId: number,
  actorStaffUserId: number,
  now = Date.now()
): Promise<BomSnapshotResult> {
  requireActor(actorStaffUserId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new BomDomainError("NOT_FOUND", "الطلب غير موجود");
  }
  const [order] = await tx
    .select({
      id: schema.doorOrders.id,
      canonicalNumber: schema.doorOrders.canonicalNumber,
      commercialStatus: schema.doorOrders.commercialStatus,
      materialState: schema.doorOrders.materialState,
      productId: schema.doorOrders.productId,
      totalDoors: schema.doorOrders.totalDoors,
      selections: schema.doorOrders.selections,
      dimensions: schema.doorOrders.dimensions,
    })
    .from(schema.doorOrders)
    .where(eq(schema.doorOrders.id, orderId))
    .for("update")
    .limit(1);
  if (!order) throw new BomDomainError("NOT_FOUND", "الطلب غير موجود");

  const [existing] = await tx
    .select({
      id: schema.bomSnapshots.id,
      canonicalNumber: schema.bomSnapshots.canonicalNumber,
      ruleSetId: schema.bomSnapshots.ruleSetId,
      lineageCode: schema.bomSnapshots.lineageCode,
      ruleSetVersion: schema.bomSnapshots.ruleSetVersion,
    })
    .from(schema.bomSnapshots)
    .where(eq(schema.bomSnapshots.doorOrderId, order.id))
    .for("update")
    .limit(1);
  if (existing) {
    const [prior] = await tx
      .select({
        id: schema.auditEvents.id,
        afterJson: schema.auditEvents.afterJson,
      })
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.entityType, "door_order"),
          eq(schema.auditEvents.entityId, order.id),
          eq(schema.auditEvents.eventType, BOM_SNAPSHOT_CREATED_EVENT)
        )
      )
      .for("update")
      .limit(1);
    if (!prior || snapshotIdFromAudit(prior.afterJson) !== existing.id) {
      throw new BomDomainError("CONFLICT", "لقطة المواد موجودة بلا سجل تدقيق مطابق");
    }
    return {
      created: false,
      snapshotId: existing.id,
      orderId: order.id,
      canonicalNumber: existing.canonicalNumber,
      ruleSetId: existing.ruleSetId,
      lineageCode: existing.lineageCode,
      ruleSetVersion: existing.ruleSetVersion,
      lines: await loadSnapshotLines(tx, existing.id),
    };
  }

  if (order.commercialStatus == null) {
    throw new BomDomainError("CONFLICT", "هذا الطلب ليس على دورة الاعتماد التجارية");
  }
  if (order.commercialStatus !== "approved") {
    throw new BomDomainError("CONFLICT", "لا يمكن إنشاء لقطة مواد إلا لطلب معتمد");
  }
  if (!order.canonicalNumber) {
    throw new BomDomainError("CONFLICT", "الطلب بلا رقم مرجعي");
  }
  if (order.materialState !== "pending_materials") {
    throw new BomDomainError("CONFLICT", "حالة المواد لا تسمح بإنشاء لقطة");
  }
  const config = readOrderConfiguration(order);

  const choice = await selectApplicablePublished(tx, config.productId);
  const [lockedSet] = await tx
    .select({
      id: schema.bomRuleSets.id,
      lineageId: schema.bomRuleSets.lineageId,
      version: schema.bomRuleSets.version,
      status: schema.bomRuleSets.status,
    })
    .from(schema.bomRuleSets)
    .where(eq(schema.bomRuleSets.id, choice.id))
    .for("update")
    .limit(1);
  if (!lockedSet || lockedSet.status !== "published") {
    throw new BomDomainError("CONFLICT", "لا توجد نسخة منشورة من قواعد المواد");
  }
  const lineage = await lockLineage(tx, lockedSet.lineageId);
  const rules = await loadRules(tx, lockedSet.id);
  const units = await loadItemUnits(
    tx,
    rules.filter((rule) => rule.enabled).map((rule) => rule.inventoryItemId)
  );
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (units.get(rule.inventoryItemId) !== rule.expectedUnit) {
      throw new BomDomainError("CONFLICT", "وحدة حساب المادة تغيرت وتحتاج نسخة قواعد جديدة");
    }
  }
  const computed = evaluateBomRules(rules, config, units);

  let snapshotId = 0;
  try {
    const inserted = await tx.insert(schema.bomSnapshots).values({
      doorOrderId: order.id,
      canonicalNumber: order.canonicalNumber,
      ruleSetId: lockedSet.id,
      lineageCode: lineage.lineageCode,
      ruleSetVersion: lockedSet.version,
      createdByStaffUserId: actorStaffUserId,
      createdAt: now,
    });
    snapshotId = insertIdOf(inserted);
  } catch (error) {
    if (!conflictFromDatabaseError(error)) throw error;
    const [won] = await tx
      .select({
        id: schema.bomSnapshots.id,
        canonicalNumber: schema.bomSnapshots.canonicalNumber,
        ruleSetId: schema.bomSnapshots.ruleSetId,
        lineageCode: schema.bomSnapshots.lineageCode,
        ruleSetVersion: schema.bomSnapshots.ruleSetVersion,
      })
      .from(schema.bomSnapshots)
      .where(eq(schema.bomSnapshots.doorOrderId, order.id))
      .for("update")
      .limit(1);
    const [prior] = won
      ? await tx
          .select({ afterJson: schema.auditEvents.afterJson })
          .from(schema.auditEvents)
          .where(
            and(
              eq(schema.auditEvents.entityType, "door_order"),
              eq(schema.auditEvents.entityId, order.id),
              eq(schema.auditEvents.eventType, BOM_SNAPSHOT_CREATED_EVENT)
            )
          )
          .limit(1)
      : [];
    if (won && snapshotIdFromAudit(prior?.afterJson) === won.id) {
      return {
        created: false,
        snapshotId: won.id,
        orderId: order.id,
        canonicalNumber: won.canonicalNumber,
        ruleSetId: won.ruleSetId,
        lineageCode: won.lineageCode,
        ruleSetVersion: won.ruleSetVersion,
        lines: await loadSnapshotLines(tx, won.id),
      };
    }
    throw new BomDomainError("CONFLICT", "لقطة المواد موجودة بلا سجل تدقيق مطابق");
  }
  if (snapshotId <= 0) throw new BomDomainError("CONFLICT", "تعذر إنشاء لقطة المواد");
  const lines: BomSnapshotLineView[] = [];
  for (let index = 0; index < computed.length; index += 1) {
    const line = computed[index]!;
    const lineInsert = await tx.insert(schema.bomSnapshotLines).values({
      snapshotId,
      lineNumber: index + 1,
      ruleId: line.ruleId,
      inventoryItemId: line.inventoryItemId,
      requiredQty: line.requiredQty,
      unit: line.unit,
      createdAt: now,
    });
    const lineId = insertIdOf(lineInsert);
    if (lineId <= 0) throw new BomDomainError("CONFLICT", "تعذر إنشاء بنود لقطة المواد");
    lines.push({
      id: lineId,
      lineNumber: index + 1,
      ruleId: line.ruleId,
      inventoryItemId: line.inventoryItemId,
      requiredQty: line.requiredQty,
      unit: line.unit,
    });
  }
  await tx.insert(schema.auditEvents).values({
    eventType: BOM_SNAPSHOT_CREATED_EVENT,
    entityType: "door_order",
    entityId: order.id,
    canonicalNumber: order.canonicalNumber,
    actorStaffUserId,
    occurredAt: now,
    beforeJson: {
      snapshotId: null,
      commercialStatus: order.commercialStatus,
      materialState: order.materialState,
    },
    afterJson: {
      snapshotId,
      ruleSetId: lockedSet.id,
      lineageCode: lineage.lineageCode,
      scopeKey: lineage.scopeKey,
      ruleSetVersion: lockedSet.version,
      lineCount: lines.length,
      commercialStatus: order.commercialStatus,
      materialState: order.materialState,
    },
  });
  return {
    created: true,
    snapshotId,
    orderId: order.id,
    canonicalNumber: order.canonicalNumber,
    ruleSetId: lockedSet.id,
    lineageCode: lineage.lineageCode,
    ruleSetVersion: lockedSet.version,
    lines,
  };
}

/** Application path: snapshot rows have no update command. */
export function rejectBomSnapshotMutation(): never {
  throw new BomDomainError("CONFLICT", "لقطة المواد ثابتة ولا تُعدَّل");
}

/** Application path: snapshot lines have no update command. */
export function rejectBomSnapshotLineMutation(): never {
  throw new BomDomainError("CONFLICT", "بنود لقطة المواد ثابتة ولا تُعدَّل");
}
