/**
 * Staff factory-order entry.
 * The client may collect order fields. The server owns identity, canonical
 * number, commercial status, and material state inside orders.create.
 */

export const FACTORY_ORDER_ENTRY_PATH = "/admin/orders/new";

export const FACTORY_ORDER_ENTRY_ROLES = ["sales_person", "sales_coordinator"] as const;

/** Fields orders.create accepts. Anything else is dropped before submit. */
export const ORDERS_CREATE_KEYS = [
  "customerName",
  "customerPhone",
  "customerEmail",
  "productId",
  "productName",
  "totalDoors",
  "selections",
  "subSelections",
  "dimensions",
  "basePrice",
  "totalPrice",
  "notes",
] as const;

/** Owned by the staff session and the creation transaction. Never sent. */
export const SERVER_OWNED_CREATE_FIELDS = [
  "actorUserId",
  "role",
  "createdBy",
  "canonicalNumber",
  "commercialStatus",
  "materialState",
  "year",
] as const;

const PRICE_MAX = 2_147_483_647;

export type FactoryOrderEntryAccess =
  | "loading"
  | "needs_staff_identity"
  | "forbidden"
  | "allowed";

export type FactoryOrderErrorCode =
  | "customer_name"
  | "customer_phone"
  | "customer_email"
  | "product"
  | "total_doors"
  | "base_price"
  | "total_price"
  | "dimension";

export type FactoryOrderFieldError = {
  field: string;
  code: FactoryOrderErrorCode;
};

export type FactoryOrderFormInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productId: string;
  productName: string;
  totalDoors: string;
  selections: Record<string, string>;
  subSelections: Record<string, Record<string, string>>;
  dimensions: Record<string, string>;
  basePrice: string;
  totalPrice: string;
  notes: string;
};

export type OrdersCreatePayload = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productId: string;
  productName: string;
  totalDoors: number;
  selections: Record<string, string>;
  subSelections: Record<string, Record<string, string>>;
  dimensions?: Record<string, number>;
  basePrice: number;
  totalPrice: number;
  notes?: string;
};

export type FactoryOrderSuccessView = {
  orderId: number;
  canonicalNumber: string;
  commercialStatus: "draft";
  commercialStatusLabel: "مسودة";
  reviewLabel: "لم يُرسل للمراجعة";
  approvalLabel: "لم يُعتمد";
  lifecycleTransition: null;
};

export type StaffOptionChoice = {
  id: string;
  label: string;
  subs: StaffOptionSub[];
};

export type StaffOptionSub = {
  id: string;
  label: string;
  type: string;
  choices: Array<{ id: string; label: string }>;
  unit?: string;
  placeholder?: string;
};

export type StaffOptionFieldKind = "single" | "multi" | "text" | "dimension" | "header";

export type StaffOptionField = {
  id: string;
  label: string;
  kind: StaffOptionFieldKind;
  choices: StaffOptionChoice[];
  unit?: string;
  placeholder?: string;
};

export type StaffOptionSection = {
  id: string;
  label: string;
  fields: StaffOptionField[];
};

export function canCreateFactoryOrder(roles: readonly string[] | null | undefined): boolean {
  if (!roles) return false;
  return roles.some(
    (role) => role === "sales_person" || role === "sales_coordinator"
  );
}

export function factoryOrderEntryAccess(
  me: { roles: readonly string[] } | null | undefined,
  meStatus: "pending" | "success" | "error"
): FactoryOrderEntryAccess {
  if (meStatus === "pending") return "loading";
  if (meStatus !== "success" || !me) return "needs_staff_identity";
  if (!canCreateFactoryOrder(me.roles)) return "forbidden";
  return "allowed";
}

/**
 * Factory order entry reads the staff session only.
 * A legacy admin cookie or a customer session cannot grant or replace it.
 */
export function factoryOrderPageAccess(input: {
  staff: { roles: readonly string[] } | null | undefined;
  staffStatus: "pending" | "success" | "error";
  legacyAdminSession: boolean;
  customerSession: boolean;
}): FactoryOrderEntryAccess {
  void input.legacyAdminSession;
  void input.customerSession;
  return factoryOrderEntryAccess(input.staff, input.staffStatus);
}

export function emptyFactoryOrderForm(): FactoryOrderFormInput {
  return {
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    productId: "",
    productName: "",
    totalDoors: "1",
    selections: {},
    subSelections: {},
    dimensions: {},
    basePrice: "",
    totalPrice: "",
    notes: "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enabledFlag(value: unknown): boolean {
  return value !== false;
}

function choiceList(raw: unknown): StaffOptionChoice[] {
  if (!Array.isArray(raw)) return [];
  const choices: StaffOptionChoice[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !enabledFlag(item.enabled)) continue;
    if (typeof item.id !== "string" || typeof item.label !== "string") continue;
    const subs: StaffOptionSub[] = [];
    if (item.hasSubOptions === true && Array.isArray(item.subOptions)) {
      for (const sub of item.subOptions) {
        if (!isRecord(sub) || typeof sub.id !== "string" || typeof sub.label !== "string") continue;
        const subChoices: Array<{ id: string; label: string }> = [];
        if (Array.isArray(sub.values)) {
          for (const value of sub.values) {
            if (!isRecord(value) || !enabledFlag(value.enabled)) continue;
            if (typeof value.id !== "string" || typeof value.label !== "string") continue;
            subChoices.push({ id: value.id, label: value.label });
          }
        }
        subs.push({
          id: sub.id,
          label: sub.label,
          type: typeof sub.type === "string" ? sub.type : "text_input",
          choices: subChoices,
          unit: typeof sub.unit === "string" ? sub.unit : undefined,
          placeholder: typeof sub.placeholder === "string" ? sub.placeholder : undefined,
        });
      }
    }
    choices.push({ id: item.id, label: item.label, subs });
  }
  return choices;
}

function fieldKind(sectionId: string, type: string): StaffOptionFieldKind {
  if (type === "section_header") return "header";
  if (type === "number_input" && sectionId === "dimensions") return "dimension";
  if (type === "checkbox_cards" || type === "checkbox_list") return "multi";
  if (type === "number_input" || type === "text_input" || type === "file_upload") return "text";
  return "single";
}

/** Narrows productOptions.get into fields this form can store on orders.create. */
export function staffOptionSectionsFromCatalog(raw: unknown): StaffOptionSection[] {
  if (!Array.isArray(raw)) return [];
  const sections: StaffOptionSection[] = [];
  for (const section of raw) {
    if (!isRecord(section) || !enabledFlag(section.enabled)) continue;
    if (typeof section.id !== "string" || typeof section.label !== "string") continue;
    const fields: StaffOptionField[] = [];
    if (Array.isArray(section.groups)) {
      for (const group of section.groups) {
        if (!isRecord(group) || !enabledFlag(group.enabled)) continue;
        if (typeof group.id !== "string" || typeof group.label !== "string") continue;
        const type = typeof group.type === "string" ? group.type : "text_input";
        fields.push({
          id: group.id,
          label: group.label,
          kind: fieldKind(section.id, type),
          choices: choiceList(group.values),
          unit: typeof group.unit === "string" ? group.unit : undefined,
          placeholder: typeof group.placeholder === "string" ? group.placeholder : undefined,
        });
      }
    }
    if (fields.length > 0) {
      sections.push({ id: section.id, label: section.label, fields });
    }
  }
  return sections;
}

export function selectedChoiceIds(field: StaffOptionField, value: string | undefined): string[] {
  if (!value) return [];
  if (field.kind === "multi") return value.split(",").map((part) => part.trim()).filter(Boolean);
  return [value];
}

function pruneGroupSubs(
  all: Record<string, Record<string, string>>,
  field: StaffOptionField,
  selectedIds: readonly string[]
): Record<string, Record<string, string>> {
  const allowed = new Set<string>();
  for (const choice of field.choices) {
    if (!selectedIds.includes(choice.id)) continue;
    for (const sub of choice.subs) allowed.add(sub.id);
  }
  const next = { ...all };
  const current = all[field.id] ?? {};
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(current)) {
    if (allowed.has(key) && value.trim()) kept[key] = value;
  }
  if (Object.keys(kept).length === 0) delete next[field.id];
  else next[field.id] = kept;
  return next;
}

export function setSingleSelection(
  form: FactoryOrderFormInput,
  field: StaffOptionField,
  value: string
): FactoryOrderFormInput {
  const selections = { ...form.selections };
  if (!value) delete selections[field.id];
  else selections[field.id] = value;
  return {
    ...form,
    selections,
    subSelections: pruneGroupSubs(form.subSelections, field, value ? [value] : []),
  };
}

export function toggleMultiSelection(
  form: FactoryOrderFormInput,
  field: StaffOptionField,
  choiceId: string
): FactoryOrderFormInput {
  const current = selectedChoiceIds(field, form.selections[field.id]);
  const nextIds = current.includes(choiceId)
    ? current.filter((id) => id !== choiceId)
    : [...current, choiceId];
  const selections = { ...form.selections };
  if (nextIds.length === 0) delete selections[field.id];
  else selections[field.id] = nextIds.join(",");
  return {
    ...form,
    selections,
    subSelections: pruneGroupSubs(form.subSelections, field, nextIds),
  };
}

export function setTextSelection(
  form: FactoryOrderFormInput,
  fieldId: string,
  value: string
): FactoryOrderFormInput {
  const selections = { ...form.selections };
  if (!value.trim()) delete selections[fieldId];
  else selections[fieldId] = value;
  return { ...form, selections };
}

export function setDimensionValue(
  form: FactoryOrderFormInput,
  fieldId: string,
  value: string
): FactoryOrderFormInput {
  const dimensions = { ...form.dimensions };
  if (!value.trim()) delete dimensions[fieldId];
  else dimensions[fieldId] = value;
  return { ...form, dimensions };
}

export function setSubSelection(
  form: FactoryOrderFormInput,
  field: StaffOptionField,
  subId: string,
  value: string
): FactoryOrderFormInput {
  const selected = selectedChoiceIds(field, form.selections[field.id]);
  const allowed = field.choices.some(
    (choice) => selected.includes(choice.id) && choice.subs.some((sub) => sub.id === subId)
  );
  if (!allowed) return form;
  const next = { ...form.subSelections };
  const group = { ...(next[field.id] ?? {}) };
  if (!value.trim()) delete group[subId];
  else group[subId] = value;
  if (Object.keys(group).length === 0) delete next[field.id];
  else next[field.id] = group;
  return { ...form, subSelections: next };
}

export function applyCatalogProduct(
  form: FactoryOrderFormInput,
  product: { id: string; name: string; basePrice: number }
): FactoryOrderFormInput {
  const next: FactoryOrderFormInput = {
    ...form,
    productId: product.id.trim(),
    productName: product.name.trim(),
  };
  if (
    Number.isInteger(product.basePrice) &&
    product.basePrice >= 0 &&
    product.basePrice <= PRICE_MAX
  ) {
    next.basePrice = String(product.basePrice);
  }
  return next;
}

export function suggestedLineTotal(basePrice: string, totalDoors: string): string | null {
  const base = parseWholeSar(basePrice);
  const doors = parsePositiveInt(totalDoors);
  if (base === null || doors === null) return null;
  const total = base * doors;
  if (!Number.isSafeInteger(total) || total > PRICE_MAX) return null;
  return String(total);
}

function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 1 || value > PRICE_MAX) return null;
  return value;
}

function parseWholeSar(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0 || value > PRICE_MAX) return null;
  return value;
}

function parseDimension(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function emailIsAcceptable(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

export function validateFactoryOrderForm(
  input: FactoryOrderFormInput
): { ok: true; payload: OrdersCreatePayload } | { ok: false; errors: FactoryOrderFieldError[] } {
  const errors: FactoryOrderFieldError[] = [];
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  const customerEmail = input.customerEmail.trim();
  const productId = input.productId.trim();
  const productName = input.productName.trim();
  const totalDoors = parsePositiveInt(input.totalDoors);
  const basePrice = parseWholeSar(input.basePrice);
  const totalPrice = parseWholeSar(input.totalPrice);

  if (!customerName) errors.push({ field: "customerName", code: "customer_name" });
  if (!customerPhone) errors.push({ field: "customerPhone", code: "customer_phone" });
  if (customerEmail && !emailIsAcceptable(customerEmail)) {
    errors.push({ field: "customerEmail", code: "customer_email" });
  }
  if (!productId || !productName) errors.push({ field: "product", code: "product" });
  if (totalDoors === null) errors.push({ field: "totalDoors", code: "total_doors" });
  if (basePrice === null) errors.push({ field: "basePrice", code: "base_price" });
  if (totalPrice === null) errors.push({ field: "totalPrice", code: "total_price" });

  const selections: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.selections)) {
    const trimmed = value.trim();
    if (trimmed) selections[key] = trimmed;
  }

  const subSelections: Record<string, Record<string, string>> = {};
  for (const [groupId, group] of Object.entries(input.subSelections)) {
    const nextGroup: Record<string, string> = {};
    for (const [subId, value] of Object.entries(group)) {
      const trimmed = value.trim();
      if (trimmed) nextGroup[subId] = trimmed;
    }
    if (Object.keys(nextGroup).length > 0) subSelections[groupId] = nextGroup;
  }

  const dimensions: Record<string, number> = {};
  for (const [key, value] of Object.entries(input.dimensions)) {
    if (!value.trim()) continue;
    const parsed = parseDimension(value);
    if (parsed === null) {
      errors.push({ field: `dimensions.${key}`, code: "dimension" });
      continue;
    }
    dimensions[key] = parsed;
  }

  if (errors.length > 0 || totalDoors === null || basePrice === null || totalPrice === null) {
    return { ok: false, errors };
  }

  const notes = input.notes.trim();
  const payload: OrdersCreatePayload = {
    customerName,
    customerPhone,
    customerEmail,
    productId,
    productName,
    totalDoors,
    selections,
    subSelections,
    basePrice,
    totalPrice,
  };
  if (notes) payload.notes = notes;
  if (Object.keys(dimensions).length > 0) payload.dimensions = dimensions;
  return { ok: true, payload };
}

export function payloadHasServerOwnedFields(payload: object): boolean {
  const keys = new Set(Object.keys(payload));
  return SERVER_OWNED_CREATE_FIELDS.some((field) => keys.has(field));
}

/**
 * Creation response is a draft. This view does not submit, approve, or
 * advance the commercial lifecycle.
 */
export function factoryOrderSuccessView(result: {
  id: number;
  canonicalNumber: string;
}): FactoryOrderSuccessView {
  return {
    orderId: result.id,
    canonicalNumber: result.canonicalNumber,
    commercialStatus: "draft",
    commercialStatusLabel: "مسودة",
    reviewLabel: "لم يُرسل للمراجعة",
    approvalLabel: "لم يُعتمد",
    lifecycleTransition: null,
  };
}
