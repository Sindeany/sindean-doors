/**
 * Staff factory-order entry UI.
 * Proves role gating, the orders.create payload, and that creation stays a draft.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { isStaffGatedAdminProcedure } from "@/lib/staffIdentity";
import {
  FACTORY_ORDER_ENTRY_PATH,
  ORDERS_CREATE_KEYS,
  SERVER_OWNED_CREATE_FIELDS,
  applyCatalogProduct,
  canCreateFactoryOrder,
  emptyFactoryOrderForm,
  factoryOrderEntryAccess,
  factoryOrderPageAccess,
  factoryOrderSuccessView,
  payloadHasServerOwnedFields,
  setSingleSelection,
  staffOptionSectionsFromCatalog,
  validateFactoryOrderForm,
  type FactoryOrderFormInput,
  type StaffOptionField,
} from "@/lib/staffFactoryOrder";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const DENIED_ROLES = [
  "admin",
  "stock_manager",
  "production_manager",
  "laminating",
  "cutting",
  "auto_line",
  "frame_architrave",
  "packing",
] as const;

const materialField: StaffOptionField = {
  id: "material",
  label: "مادة الباب",
  kind: "single",
  choices: [
    {
      id: "wood",
      label: "خشب",
      subs: [{ id: "grade", label: "الدرجة", type: "chips", choices: [{ id: "a", label: "A" }] }],
    },
    { id: "wpc", label: "WPC", subs: [] },
  ],
};

function readyForm(overrides: Partial<FactoryOrderFormInput> = {}): FactoryOrderFormInput {
  return {
    ...emptyFactoryOrderForm(),
    customerName: "  نورة  ",
    customerPhone: " 0550000000 ",
    customerEmail: " buyer@example.com ",
    productId: "12",
    productName: "باب سنديان",
    totalDoors: "2",
    selections: { material: "wood", blank: "  " },
    subSelections: { material: { grade: " a ", empty: " " } },
    dimensions: { width: "90", skip: " " },
    basePrice: "1200",
    totalPrice: "2400",
    notes: "  قرب المدخل  ",
    ...overrides,
  };
}

describe("factory order entry access", () => {
  it("allows sales_person and sales_coordinator, including when combined with another role", () => {
    expect(factoryOrderEntryAccess({ roles: ["sales_person"] }, "success")).toBe("allowed");
    expect(factoryOrderEntryAccess({ roles: ["sales_coordinator"] }, "success")).toBe("allowed");
    expect(canCreateFactoryOrder(["admin", "sales_coordinator"])).toBe(true);
    expect(factoryOrderEntryAccess({ roles: ["stock_manager", "sales_person"] }, "success")).toBe(
      "allowed"
    );
  });

  it("hides the create UI from every non-sales role", () => {
    for (const role of DENIED_ROLES) {
      expect(canCreateFactoryOrder([role])).toBe(false);
      expect(factoryOrderEntryAccess({ roles: [role] }, "success")).toBe("forbidden");
    }
    expect(canCreateFactoryOrder([])).toBe(false);
    expect(canCreateFactoryOrder(null)).toBe(false);
  });

  it("asks for a staff identity while the session is missing", () => {
    expect(factoryOrderEntryAccess(undefined, "pending")).toBe("loading");
    expect(factoryOrderEntryAccess(null, "error")).toBe("needs_staff_identity");
    expect(factoryOrderEntryAccess(undefined, "error")).toBe("needs_staff_identity");
    expect(factoryOrderEntryAccess(undefined, "success")).toBe("needs_staff_identity");
  });
});

describe("factory order route ignores legacy admin and customer sessions", () => {
  it("lets sales_person and sales_coordinator in with a staff session alone", () => {
    expect(
      factoryOrderPageAccess({
        staff: { roles: ["sales_person"] },
        staffStatus: "success",
        legacyAdminSession: false,
        customerSession: false,
      })
    ).toBe("allowed");
    expect(
      factoryOrderPageAccess({
        staff: { roles: ["sales_coordinator"] },
        staffStatus: "success",
        legacyAdminSession: false,
        customerSession: false,
      })
    ).toBe("allowed");
    expect(
      factoryOrderPageAccess({
        staff: { roles: ["admin", "sales_coordinator"] },
        staffStatus: "success",
        legacyAdminSession: false,
        customerSession: false,
      })
    ).toBe("allowed");
  });

  it("does not treat a legacy admin cookie or a customer session as access", () => {
    expect(
      factoryOrderPageAccess({
        staff: null,
        staffStatus: "error",
        legacyAdminSession: true,
        customerSession: false,
      })
    ).toBe("needs_staff_identity");
    expect(
      factoryOrderPageAccess({
        staff: null,
        staffStatus: "error",
        legacyAdminSession: false,
        customerSession: true,
      })
    ).toBe("needs_staff_identity");
    expect(
      factoryOrderPageAccess({
        staff: null,
        staffStatus: "error",
        legacyAdminSession: false,
        customerSession: false,
      })
    ).toBe("needs_staff_identity");
    expect(
      factoryOrderPageAccess({
        staff: { roles: ["admin"] },
        staffStatus: "success",
        legacyAdminSession: true,
        customerSession: false,
      })
    ).toBe("forbidden");
  });

  it("keeps non-sales staff out even when a legacy admin cookie is also present", () => {
    for (const role of DENIED_ROLES) {
      expect(
        factoryOrderPageAccess({
          staff: { roles: [role] },
          staffStatus: "success",
          legacyAdminSession: true,
          customerSession: false,
        })
      ).toBe("forbidden");
    }
  });
});

describe("orders.create payload", () => {
  it("sends only contract fields and keeps the entered total", () => {
    const result = validateFactoryOrderForm(readyForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      customerName: "نورة",
      customerPhone: "0550000000",
      customerEmail: "buyer@example.com",
      productId: "12",
      productName: "باب سنديان",
      totalDoors: 2,
      selections: { material: "wood" },
      subSelections: { material: { grade: "a" } },
      dimensions: { width: 90 },
      basePrice: 1200,
      totalPrice: 2400,
      notes: "قرب المدخل",
    });
    expect(Object.keys(result.payload).every((key) => (ORDERS_CREATE_KEYS as readonly string[]).includes(key))).toBe(
      true
    );
    expect(payloadHasServerOwnedFields(result.payload)).toBe(false);
    expect(result.payload).not.toHaveProperty("customerId");
    for (const field of SERVER_OWNED_CREATE_FIELDS) {
      expect(result.payload).not.toHaveProperty(field);
    }
  });

  it("drops client authority fields even if they are attached to the form object", () => {
    const dirty = {
      ...readyForm(),
      actorUserId: 41,
      role: "admin",
      createdBy: 7,
      canonicalNumber: "SD-1999-000001",
      commercialStatus: "approved",
      materialState: "released",
      year: 1999,
    } as FactoryOrderFormInput;
    const result = validateFactoryOrderForm(dirty);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(payloadHasServerOwnedFields(result.payload)).toBe(false);
    expect(JSON.stringify(result.payload)).not.toContain("SD-1999");
    expect(JSON.stringify(result.payload)).not.toContain("approved");
    expect(JSON.stringify(result.payload)).not.toContain("released");
  });

  it("rejects an empty customer, a missing product, a bad quantity, and a fractional price", () => {
    const result = validateFactoryOrderForm(
      readyForm({
        customerName: " ",
        customerPhone: "",
        customerEmail: "not-an-email",
        productId: "",
        productName: "",
        totalDoors: "0",
        basePrice: "1200.5",
        totalPrice: "",
      })
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toEqual([
      "customer_name",
      "customer_phone",
      "customer_email",
      "product",
      "total_doors",
      "base_price",
      "total_price",
    ]);
  });

  it("keeps a blank email and omits empty notes", () => {
    const result = validateFactoryOrderForm(readyForm({ customerEmail: "  ", notes: "  " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.customerEmail).toBe("");
    expect(result.payload).not.toHaveProperty("notes");
  });
});

describe("catalog configuration", () => {
  const sections = staffOptionSectionsFromCatalog([
    {
      id: "door_type",
      label: "نوع الباب",
      enabled: true,
      groups: [
        {
          id: "material",
          label: "مادة الباب",
          type: "radio_cards",
          enabled: true,
          values: [
            { id: "wood", label: "خشب", enabled: true },
            { id: "hidden", label: "مخفي", enabled: false },
          ],
        },
      ],
    },
    {
      id: "delivery",
      label: "التسليم",
      enabled: false,
      groups: [{ id: "slot", label: "موعد", type: "text_input", enabled: true, values: [] }],
    },
    {
      id: "dimensions",
      label: "المقاسات",
      enabled: true,
      groups: [
        { id: "height", label: "الطول", type: "section_header", enabled: true, values: [] },
        { id: "width", label: "العرض", type: "number_input", enabled: true, unit: "سم", values: [] },
        {
          id: "frame_width",
          label: "عرض البرواز",
          type: "chips",
          enabled: true,
          values: [{ id: "10cm", label: "10 سم", enabled: true }],
        },
      ],
    },
  ]);

  it("keeps dimension numbers out of selections and drops disabled options", () => {
    expect(sections.map((section) => section.id)).toEqual(["door_type", "dimensions"]);
    const width = sections[1]?.fields.find((field) => field.id === "width");
    const frame = sections[1]?.fields.find((field) => field.id === "frame_width");
    expect(width?.kind).toBe("dimension");
    expect(frame?.kind).toBe("single");
    expect(sections[0]?.fields[0]?.choices.map((choice) => choice.id)).toEqual(["wood"]);

    const withFrame = setSingleSelection(readyForm({ dimensions: { width: "90" } }), frame!, "10cm");
    const result = validateFactoryOrderForm(withFrame);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.dimensions).toEqual({ width: 90 });
    expect(result.payload.selections).toEqual({ material: "wood", frame_width: "10cm" });
  });

  it("drops sub-selections when the parent choice changes", () => {
    const selected = setSingleSelection(emptyFactoryOrderForm(), materialField, "wood");
    const withSub = {
      ...selected,
      subSelections: { material: { grade: "a" } },
    };
    const switched = setSingleSelection(withSub, materialField, "wpc");
    expect(switched.selections).toEqual({ material: "wpc" });
    expect(switched.subSelections).toEqual({});
  });

  it("copies the catalog base price in whole riyals and leaves the total for the staff member", () => {
    const next = applyCatalogProduct(emptyFactoryOrderForm(), {
      id: " 4 ",
      name: " باب ",
      basePrice: 1450,
    });
    expect(next.productId).toBe("4");
    expect(next.productName).toBe("باب");
    expect(next.basePrice).toBe("1450");
    expect(next.totalPrice).toBe("");
    expect(next).not.toHaveProperty("canonicalNumber");
  });
});

describe("create success", () => {
  it("shows the canonical number and stays a draft with no lifecycle transition", () => {
    expect(
      factoryOrderSuccessView({ id: 4, canonicalNumber: "SD-2026-000123" })
    ).toEqual({
      orderId: 4,
      canonicalNumber: "SD-2026-000123",
      commercialStatus: "draft",
      commercialStatusLabel: "مسودة",
      reviewLabel: "لم يُرسل للمراجعة",
      approvalLabel: "لم يُعتمد",
      lifecycleTransition: null,
    });
  });
});

describe("factory order page wiring", () => {
  const page = source("client/src/pages/admin/AdminFactoryOrderEntry.tsx");
  const layout = source("client/src/components/admin/AdminLayout.tsx");
  const app = source("client/src/App.tsx");
  const wizard = source("client/src/components/DoorOrderWizard.tsx");
  const productPage = source("client/src/pages/ProductDetail.tsx");

  it("registers a staff route that does not pass through the legacy admin shell", () => {
    expect(FACTORY_ORDER_ENTRY_PATH).toBe("/admin/orders/new");
    expect(app.indexOf('path={"/admin/orders/new"}')).toBeGreaterThan(-1);
    expect(app.indexOf('path={"/admin/orders/new"}')).toBeLessThan(app.indexOf('path={"/admin/orders"}'));
    expect(page).toContain("factoryOrderPageAccess");
    expect(page).toContain("legacyAdminSession: false");
    expect(page).toContain("customerSession: false");
    expect(page).toContain("trpc.staffAuth.me.useQuery");
    expect(page).toContain("StaffIdentityControl");
    expect(page).not.toContain("AdminLayout");
    expect(page).not.toContain("useAdminAuth");
    expect(page).not.toContain("adminAuth");
    expect(page).not.toContain("/admin/login");
    expect(page).toContain('access === "allowed"');
    expect(page).toContain("if (access !== \"allowed\") return;");
    expect(page).toContain("لا يمكن إنشاء طلب مصنع بهذا الدور");
    expect(page).toContain("يلزم تسجيل هوية الموظف");
    expect(page).toContain("جلسة المدير أو حساب العميل لا يفتحانها");
    expect(layout).toContain("if (!isAdminLoggedIn)");
    expect(layout).toContain('navigate("/admin/login")');
    expect(layout).toContain("salesOrderEntry: true");
    expect(layout).toContain("canCreateFactoryOrder");
  });

  it("submits through orders.create and does not send server-owned fields", () => {
    expect(page).toContain("trpc.orders.create.useMutation");
    expect(page).toContain("if (access !== \"allowed\") return;");
    expect(page.indexOf("if (access !== \"allowed\") return;")).toBeLessThan(
      page.indexOf("createOrder.mutate(validated.payload)")
    );
    expect(page).toContain("createOrder.mutate(validated.payload)");
    expect(page).toContain("validateFactoryOrderForm");
    expect(page).not.toContain("actorUserId");
    expect(page).not.toContain("createdBy");
    expect(page).not.toContain("materialState");
    expect(page).not.toMatch(/canonicalNumber\s*:/);
    expect(page).not.toMatch(/commercialStatus\s*:/);
    expect(page).not.toContain("customerId");
    expect(isStaffGatedAdminProcedure("orders.create")).toBe(true);
  });

  it("renders the canonical number from the draft success view and does not advance the order", () => {
    expect(page).toContain("factoryOrderSuccessView");
    expect(page).toContain("success.canonicalNumber");
    expect(page).toContain("data-status={success.commercialStatus}");
    expect(page).toContain("success.commercialStatusLabel");
    expect(page).toContain("success.reviewLabel");
    expect(page).toContain("success.approvalLabel");
    expect(page).not.toContain("/admin/orders");
    expect(page).not.toContain("FACTORY_ORDER_LIST_PATH");
    expect(page).not.toContain("عرض الطلب");
    expect(page).not.toContain("submitForCoordinatorReview");
    expect(page).not.toContain("submitForAdminReview");
    expect(page).not.toContain("orders.approve");
    expect(page).not.toContain("orders.reject");
    expect(page).not.toContain("orders.cancel");
    expect(page).not.toContain('"approved"');
  });

  it("keeps the customer door wizard disconnected from canonical creation", () => {
    expect(wizard).not.toContain("orders.create");
    expect(wizard).not.toContain("trpc.orders");
    expect(wizard).not.toContain("AdminFactoryOrderEntry");
    expect(productPage).not.toContain("orders.create");
    expect(productPage).not.toContain("trpc.orders");
    expect(productPage).not.toContain("AdminFactoryOrderEntry");
    expect(page).not.toContain("DoorOrderWizard");
    expect(page).toContain('data-customer-mode="manual"');
  });
});
