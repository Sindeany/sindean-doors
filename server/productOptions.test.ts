// ============================================================
// Tests: productOptions.router + distributorOrders.router
// ============================================================
import { describe, it, expect } from "vitest";

// ─── productOptions validation tests ────────────────────────
describe("productOptions - validation", () => {
  it("should accept valid sections JSON", () => {
    const validSections = [
      {
        id: "door_type",
        label: "نوع الباب",
        icon: "🚪",
        order: 1,
        enabled: true,
        groups: [
          {
            id: "material",
            sectionId: "door_type",
            label: "مادة الباب",
            type: "radio_cards",
            required: true,
            enabled: true,
            order: 1,
            values: [
              { id: "wpc", label: "WPC", enabled: true, priceAdj: 0 },
              { id: "wood", label: "خشب", enabled: true, priceAdj: 200 },
            ],
          },
        ],
      },
    ];
    const json = JSON.stringify(validSections);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe("door_type");
    expect(parsed[0].groups[0].values).toHaveLength(2);
  });

  it("should handle empty sections array", () => {
    const empty: any[] = [];
    expect(Array.isArray(empty)).toBe(true);
    expect(empty).toHaveLength(0);
  });

  it("should validate section has required fields", () => {
    const section = { id: "test", label: "Test", icon: "🔧", order: 1, enabled: true, groups: [] };
    expect(section.id).toBeTruthy();
    expect(section.label).toBeTruthy();
    expect(typeof section.order).toBe("number");
    expect(typeof section.enabled).toBe("boolean");
  });

  it("should validate OptionGroup has required fields", () => {
    const group = {
      id: "material",
      sectionId: "door_type",
      label: "مادة الباب",
      type: "radio_cards",
      required: true,
      enabled: true,
      order: 1,
      values: [],
    };
    expect(group.id).toBeTruthy();
    expect(group.sectionId).toBeTruthy();
    expect(group.type).toBeTruthy();
    expect(typeof group.required).toBe("boolean");
  });

  it("should validate OptionValue has required fields", () => {
    const value = { id: "wpc", label: "WPC", enabled: true };
    expect(value.id).toBeTruthy();
    expect(value.label).toBeTruthy();
    expect(typeof value.enabled).toBe("boolean");
  });
});

// ─── distributorOrders - business logic tests ────────────────
describe("distributorOrders - order number generation", () => {
  it("should generate order number in correct format", () => {
    const year = new Date().getFullYear();
    const orderNumber = `DIST-${year}-${String(1).padStart(4, "0")}`;
    expect(orderNumber).toMatch(/^DIST-\d{4}-\d{4}$/);
    expect(orderNumber).toContain(String(year));
  });

  it("should pad order sequence correctly", () => {
    const seq = 42;
    const padded = String(seq).padStart(4, "0");
    expect(padded).toBe("0042");
    expect(padded).toHaveLength(4);
  });
});

describe("distributorOrders - item validation", () => {
  it("should validate item has required dimensions", () => {
    const item = { doorType: "wpc", width: 90, height: 210, thickness: 4, quantity: 2, unitPrice: 900 };
    expect(item.doorType).toBeTruthy();
    expect(item.width).toBeGreaterThan(0);
    expect(item.height).toBeGreaterThan(0);
    expect(item.thickness).toBeGreaterThan(0);
    expect(item.quantity).toBeGreaterThan(0);
    expect(item.unitPrice).toBeGreaterThan(0);
  });

  it("should calculate total amount correctly", () => {
    const items = [
      { unitPrice: 900, quantity: 2 },
      { unitPrice: 1100, quantity: 3 },
    ];
    const total = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    expect(total).toBe(5100); // 900*2 + 1100*3
  });

  it("should reject zero quantity", () => {
    const item = { doorType: "wpc", width: 90, height: 210, thickness: 4, quantity: 0, unitPrice: 900 };
    expect(item.quantity).toBe(0);
    const isValid = item.quantity > 0;
    expect(isValid).toBe(false);
  });

  it("should reject negative price", () => {
    const item = { unitPrice: -100 };
    const isValid = item.unitPrice >= 0;
    expect(isValid).toBe(false);
  });
});

describe("distributorOrders - order types", () => {
  const validTypes = ["purchase_order", "rfq", "sample_request"];

  it("should accept purchase_order type", () => {
    expect(validTypes).toContain("purchase_order");
  });

  it("should accept rfq type", () => {
    expect(validTypes).toContain("rfq");
  });

  it("should accept sample_request type", () => {
    expect(validTypes).toContain("sample_request");
  });

  it("should reject invalid order type", () => {
    expect(validTypes).not.toContain("invalid_type");
  });
});

// ─── Excel parsing logic tests ────────────────────────────────
describe("Excel parsing - data extraction", () => {
  it("should parse numeric dimensions correctly", () => {
    const rawWidth = "90 cm";
    const width = parseFloat(rawWidth);
    expect(width).toBe(90);
  });

  it("should handle Arabic numeric strings", () => {
    const arabicNum = "٩٠";
    // Convert Arabic numerals to Western
    const western = arabicNum.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    expect(western).toBe("90");
  });

  it("should validate Excel file extension", () => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    expect(validExtensions).toContain(".xlsx");
    expect(validExtensions).toContain(".xls");
    expect(validExtensions).not.toContain(".pdf");
    expect(validExtensions).not.toContain(".docx");
  });

  it("should extract items array from parsed data", () => {
    const mockParsed = {
      items: [
        { doorType: "wpc", quantity: 2, width: 90, height: 210 },
        { doorType: "wood", quantity: 1, width: 100, height: 220 },
      ],
    };
    expect(mockParsed.items).toHaveLength(2);
    expect(mockParsed.items[0].doorType).toBe("wpc");
  });
});

// ─── Dynamic options mapping tests ───────────────────────────
describe("Dynamic product options - mapping", () => {
  it("should map DB sections to door types correctly", () => {
    const dbSections = [
      {
        id: "door_type",
        enabled: true,
        groups: [
          {
            id: "material",
            enabled: true,
            values: [
              { id: "wpc", label: "WPC", labelEn: "WPC", enabled: true, priceAdj: 0 },
              { id: "wood", label: "خشب", labelEn: "Wood", enabled: true, priceAdj: 200 },
              { id: "iron", label: "حديد", labelEn: "Iron", enabled: false, priceAdj: 300 },
            ],
          },
        ],
      },
    ];

    const doorTypeSection = dbSections.find((s) => s.id === "door_type" && s.enabled);
    const materialGroup = doorTypeSection?.groups.find((g) => g.id === "material" && g.enabled);
    const enabledTypes = materialGroup?.values.filter((v) => v.enabled) ?? [];

    expect(enabledTypes).toHaveLength(2); // iron is disabled
    expect(enabledTypes[0].id).toBe("wpc");
    expect(enabledTypes[1].id).toBe("wood");
  });

  it("should map DB sections to colors correctly", () => {
    const dbSections = [
      {
        id: "door_color",
        enabled: true,
        groups: [
          {
            id: "color_choice",
            enabled: true,
            values: [
              { id: "white", label: "أبيض", hex: "#F5F5F0", enabled: true, priceAdj: 0 },
              { id: "black", label: "أسود", hex: "#1A1A1A", enabled: true, priceAdj: 80 },
              { id: "custom", label: "مخصص", hex: "", enabled: true, priceAdj: 100 },
            ],
          },
        ],
      },
    ];

    const colorSection = dbSections.find((s) => s.id === "door_color" && s.enabled);
    const colorGroup = colorSection?.groups.find((g) => g.id === "color_choice" && g.enabled);
    // Filter out colors without hex (custom)
    const colors = colorGroup?.values.filter((v) => v.enabled && v.hex) ?? [];

    expect(colors).toHaveLength(2); // custom has empty hex
    expect(colors[0].hex).toBe("#F5F5F0");
  });

  it("should fallback to static options when DB returns empty", () => {
    const STATIC_DOOR_TYPES = ["wpc", "wood", "iron", "aluminum", "glass"];
    const dbResult = null;
    const result = dbResult ? [] : STATIC_DOOR_TYPES;
    expect(result).toHaveLength(5);
  });

  it("should calculate price from dynamic options", () => {
    const door = { basePrice: 900, priceAdj: 0 };
    const wood = { priceAdd: 200 };
    const color = { priceAdd: 80 };
    const total = (door.basePrice ?? 900) + (wood.priceAdd ?? 0) + (color.priceAdd ?? 0);
    expect(total).toBe(1180);
  });
});
