/**
 * Product Options & Distributor Orders Router
 * - مزامنة خيارات المنتج بين لوحة الإدارة ونموذج الموزع
 * - إنشاء وإدارة طلبات الموزعين (يدوي + Excel)
 * - استخراج بيانات Excel بالذكاء الاصطناعي مع مطابقة الخيارات الديناميكية
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { db, schema } from "./db.js";
import { eq, desc, like } from "drizzle-orm";
import * as XLSX from "xlsx";
import { invokeLLM } from "./llm.js";
import { publicProcedure, adminProcedure, distributorProcedure, router } from "./trpc.js";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OptionValue {
  id: string;
  label: string;
  labelEn?: string;
  hex?: string;
  priceAdj?: number;
  enabled: boolean;
  description?: string;
}
interface OptionGroup {
  id: string;
  sectionId: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  values: OptionValue[];
  min?: number;
  max?: number;
  unit?: string;
}
interface Section {
  id: string;
  label: string;
  enabled: boolean;
  groups: OptionGroup[];
}
interface ParsedOptions {
  materials: OptionValue[]; // door_type.material
  colors: OptionValue[]; // door_color.color_choice
  shapes: OptionValue[]; // door_shape.style
  dimGroups: OptionGroup[]; // dimensions groups
  allSections: Section[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `SND-${year}-D${rand}`;
}

/**
 * مطابقة ذكية: تجد أقرب خيار متاح لقيمة نصية مدخلة
 * تدعم: المطابقة الكاملة، الجزئية، والمطابقة بعد إزالة المسافات وتوحيد الحالة
 */
function fuzzyMatch(input: string, options: OptionValue[]): OptionValue | null {
  if (!input || !options.length) return null;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
  const normInput = norm(input);

  // 1. مطابقة كاملة (label أو labelEn)
  let match = options.find(
    o =>
      norm(o.label) === normInput ||
      (o.labelEn && norm(o.labelEn) === normInput)
  );
  if (match) return match;

  // 2. مطابقة جزئية (input يحتوي على label أو العكس)
  match = options.find(
    o =>
      normInput.includes(norm(o.label)) ||
      norm(o.label).includes(normInput) ||
      (o.labelEn &&
        (normInput.includes(norm(o.labelEn)) ||
          norm(o.labelEn).includes(normInput)))
  );
  if (match) return match;

  // 3. مطابقة id
  match = options.find(o => norm(o.id) === normInput);
  return match || null;
}

/**
 * جلب وتحليل خيارات المنتج من قاعدة البيانات
 */
async function fetchParsedOptions(): Promise<ParsedOptions> {
  const defaults: ParsedOptions = {
    materials: [
      { id: "wpc", label: "WPC", enabled: true },
      { id: "wood", label: "خشب", enabled: true },
      { id: "iron", label: "حديد", enabled: true },
      { id: "aluminum", label: "ألمنيوم", enabled: true },
      { id: "glass", label: "زجاج", enabled: true },
    ],
    colors: [
      { id: "white", label: "أبيض", hex: "#F5F5F0", enabled: true },
      { id: "beige", label: "بيج", hex: "#E8DFD0", enabled: true },
      { id: "dark_walnut", label: "جوز داكن", hex: "#3D2B1F", enabled: true },
      { id: "charcoal", label: "فحمي", hex: "#2D2D2D", enabled: true },
      { id: "grey", label: "رمادي", hex: "#8E8E8E", enabled: true },
    ],
    shapes: [],
    dimGroups: [],
    allSections: [],
  };

  const optionsRow = await db.query.productOptions.findFirst({
    orderBy: [desc(schema.productOptions.updatedAt)],
  });
  if (!optionsRow) return defaults;

  try {
    const sections = JSON.parse(optionsRow.sectionsJson) as Section[];
    const enabledSections = sections.filter(s => s.enabled);

    const doorTypeSection = enabledSections.find(s => s.id === "door_type");
    const colorSection = enabledSections.find(s => s.id === "door_color");
    const shapeSection = enabledSections.find(s => s.id === "door_shape");
    const dimSection = enabledSections.find(s => s.id === "dimensions");

    const materials = doorTypeSection
      ? (doorTypeSection.groups
          .find(g => g.id === "material")
          ?.values.filter(v => v.enabled) ?? defaults.materials)
      : defaults.materials;

    const colors = colorSection
      ? (colorSection.groups
          .find(g => g.id === "color_choice")
          ?.values.filter(v => v.enabled) ?? defaults.colors)
      : defaults.colors;

    const shapes = shapeSection
      ? (shapeSection.groups
          .find(g => g.id === "style")
          ?.values.filter(v => v.enabled) ?? [])
      : [];

    const dimGroups = dimSection
      ? dimSection.groups.filter(g => g.enabled)
      : [];

    return {
      materials,
      colors,
      shapes,
      dimGroups,
      allSections: enabledSections,
    };
  } catch {
    return defaults;
  }
}

/**
 * بناء ملخص الخيارات للـ AI prompt
 */
function buildOptionsSummary(opts: ParsedOptions): string {
  const lines: string[] = [];

  lines.push(
    `مواد الباب المتاحة: [${opts.materials.map(m => m.label).join(", ")}]`
  );
  lines.push(
    `ألوان الباب المتاحة: [${opts.colors
      .filter(c => c.id !== "custom")
      .map(c => c.label)
      .join(", ")}]`
  );

  if (opts.shapes.length) {
    lines.push(
      `أشكال الباب المتاحة: [${opts.shapes.map(s => s.label).join(", ")}]`
    );
  }

  if (opts.dimGroups.length) {
    const standardGroup = opts.dimGroups.find(g => g.id === "standard_sizes");
    if (standardGroup?.values.length) {
      lines.push(
        `المقاسات القياسية: [${standardGroup.values
          .filter(v => v.enabled)
          .map(v => v.label)
          .join(", ")}]`
      );
    }
    const customGroup = opts.dimGroups.find(g => g.id === "custom_dimensions");
    if (customGroup) {
      lines.push(
        `نطاق العرض: ${customGroup.min ?? 50} - ${customGroup.max ?? 200} سم`
      );
    }
  } else {
    lines.push("نطاق العرض: 50 - 200 سم");
    lines.push("نطاق الارتفاع: 150 - 300 سم");
  }

  return lines.join("\n");
}

// ── Product Options Router ────────────────────────────────────────────────────
const productOptionsRouter = router({
  // جلب الخيارات الحالية (يُستخدم في نموذج الموزع)
  get: publicProcedure.query(async () => {
    const row = await db.query.productOptions.findFirst({
      orderBy: [desc(schema.productOptions.updatedAt)],
    });
    if (!row) return null;
    try {
      const sections = JSON.parse(row.sectionsJson);
      if (Array.isArray(sections)) {
        for (const sec of sections) {
          if (sec.id === "door_shape" && Array.isArray(sec.groups)) {
            for (const grp of sec.groups) {
              if (grp.id === "style") {
                grp.type = "checkbox_cards";
              }
            }
          }
        }
      }
      return sections;
    } catch {
      return null;
    }
  }),

  // حفظ الخيارات (يُستخدم من لوحة الإدارة عند التعديل)
  save: adminProcedure
    .input(
      z.object({
        sectionsJson: z.string().min(1),
        updatedBy: z.string().default("admin"),
      })
    )
    .mutation(async ({ input }) => {
      const now = Date.now();
      try {
        JSON.parse(input.sectionsJson);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "بيانات الخيارات غير صحيحة",
        });
      }
      const existing = await db.query.productOptions.findFirst();
      if (existing) {
        await db
          .update(schema.productOptions)
          .set({
            sectionsJson: input.sectionsJson,
            updatedAt: now,
            updatedBy: input.updatedBy,
          })
          .where(eq(schema.productOptions.id, existing.id));
      } else {
        await db.insert(schema.productOptions).values({
          sectionsJson: input.sectionsJson,
          updatedAt: now,
          updatedBy: input.updatedBy,
        });
      }
      return { success: true };
    }),
});

// ── Distributor Orders Router ─────────────────────────────────────────────────
const distributorOrdersRouter = router({
  // إنشاء طلب يدوي
  create: distributorProcedure
    .input(
      z.object({
        orderType: z
          .enum(["purchase_order", "rfq", "sample_request"])
          .default("purchase_order"),
        items: z.array(
          z.object({
            doorType: z.string(),
            doorTypeEn: z.string().optional(),
            woodType: z.string().optional(),
            woodTypeEn: z.string().optional(),
            color: z.string().optional(),
            colorEn: z.string().optional(),
            colorHex: z.string().optional(),
            width: z.number(),
            height: z.number(),
            thickness: z.number().optional(),
            quantity: z.number().min(1),
            unitPrice: z.number().default(0),
            notes: z.string().optional(),
            selections: z.record(z.string(), z.string()).optional(),
          })
        ),
        totalAmount: z.number().default(0),
        notes: z.string().optional(),
        source: z.enum(["manual", "excel_upload", "api"]).default("manual"),
        excelFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const now = Date.now();
      const orderNumber = generateOrderNumber();

      const [result] = await db.insert(schema.distributorOrders).values({
        orderNumber,
        distributorId: String(ctx.distributor.id),
        distributorName: ctx.distributor.name,
        distributorCompany: ctx.distributor.company ?? null,
        orderType: input.orderType,
        items: JSON.stringify(input.items),
        totalAmount: input.totalAmount,
        status: "pending",
        paymentStatus: "unpaid",
        notes: input.notes,
        source: input.source,
        excelFileName: input.excelFileName,
        createdAt: now,
        updatedAt: now,
      });

      const orderId = (result as any).insertId;

      // إشعار الإدارة
      try {
        const ownerOpenId = process.env.OWNER_OPEN_ID;
        const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
        const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
        if (ownerOpenId && apiUrl && apiKey) {
          const typeLabel =
            input.orderType === "purchase_order"
              ? "أمر شراء"
              : input.orderType === "rfq"
                ? "طلب تسعير"
                : "طلب عينات";
          await fetch(`${apiUrl}/v1/notification/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              open_id: ownerOpenId,
              title: `📦 ${typeLabel} جديد من موزع — ${orderNumber}`,
              content: `الموزع: ${ctx.distributor.name} (${ctx.distributor.company || ""})\nعدد البنود: ${input.items.length}\nالإجمالي: ${input.totalAmount.toLocaleString()} ر.س\nالمصدر: ${input.source === "excel_upload" ? "رفع Excel" : "يدوي"}`,
            }),
          });
        }
      } catch {
        /* non-blocking */
      }

      return { id: orderId, orderNumber, success: true };
    }),

  // جلب طلبات الموزع (للإدارة)
  list: adminProcedure
    .input(
      z
        .object({
          distributorId: z.string().optional(),
          status: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const orders = await db.query.distributorOrders.findMany({
        orderBy: [desc(schema.distributorOrders.createdAt)],
        where: input?.distributorId
          ? eq(schema.distributorOrders.distributorId, input.distributorId)
          : undefined,
      });
      return orders.map(o => ({
        ...o,
        items: (() => {
          try {
            return JSON.parse(o.items);
          } catch {
            return [];
          }
        })(),
      }));
    }),

  // تحديث حالة الطلب
  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "draft",
          "pending",
          "confirmed",
          "manufacturing",
          "shipped",
          "delivered",
          "cancelled",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const order = await db.query.distributorOrders.findFirst({
        where: eq(schema.distributorOrders.id, input.id),
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      await db
        .update(schema.distributorOrders)
        .set({ status: input.status, updatedAt: Date.now() })
        .where(eq(schema.distributorOrders.id, input.id));

      if (input.status === "confirmed") {
        let itemsList: any[] = [];
        try {
          itemsList = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
        } catch {
          itemsList = [];
        }

        const dist = await db.query.distributors.findFirst({
          where: eq(schema.distributors.id, Number(order.distributorId)),
        });

        for (const it of itemsList) {
          const selectionsObj = it.selections || {};
          const subSelectionsObj = it.subSelections || {};
          
          await db.insert(schema.doorOrders).values({
            customerName: order.distributorCompany || order.distributorName,
            customerPhone: dist?.phone || order.distributorId,
            customerEmail: dist?.email || null,
            productId: it.doorType || "interior",
            productName: it.doorTypeEn || it.doorType || "Door",
            selections: selectionsObj,
            subSelections: subSelectionsObj,
            dimensions: {
              width: it.width || 90,
              height: it.height || 210,
              thickness: it.thickness || 4,
            },
            basePrice: Math.round(it.unitPrice || 0),
            totalPrice: Math.round((it.unitPrice || 0) * (it.quantity || 1)),
            status: "confirmed",
            workflowStage: "po_review",
            priority: "normal",
            totalDoors: it.quantity || 1,
            paymentStatus: order.paymentStatus === "paid" ? "paid" : order.paymentStatus === "partial" ? "partial" : "unpaid",
            notes: `DIST_ORDER_ID:${order.id} - ${it.notes || ""}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      if (input.status === "cancelled") {
        await db
          .update(schema.doorOrders)
          .set({ status: "cancelled", updatedAt: Date.now() })
          .where(like(schema.doorOrders.notes, `DIST_ORDER_ID:${order.id}%`));
      }

      return { success: true };
    }),

  updatePaymentStatus: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        paymentStatus: z.enum(["unpaid", "partial", "paid"]),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(schema.distributorOrders)
        .set({ paymentStatus: input.paymentStatus, updatedAt: Date.now() })
        .where(eq(schema.distributorOrders.id, input.orderId));
      return { success: true };
    }),

  // ── رفع وتحليل ملف Excel ──────────────────────────────────────────────────
  parseExcel: publicProcedure
    .input(
      z.object({
        base64: z.string(),
        fileName: z.string(),
        distributorId: z.string(),
        distributorName: z.string(),
        distributorCompany: z.string().optional(),
        orderType: z
          .enum(["purchase_order", "rfq", "sample_request"])
          .default("purchase_order"),
      })
    )
    .mutation(async ({ input }) => {
      // 1. قراءة الملف
      let workbook: XLSX.WorkBook;
      try {
        const buffer = Buffer.from(input.base64, "base64");
        workbook = XLSX.read(buffer, { type: "buffer" });
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "تعذّر قراءة الملف. تأكد أنه ملف Excel صحيح (.xlsx, .xls, .csv)",
        });
      }

      const sheetName = workbook.SheetNames[0];
      if (!sheetName)
        throw new TRPCError({ code: "BAD_REQUEST", message: "الملف فارغ" });

      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
      }) as string[][];

      if (rawData.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الملف لا يحتوي على بيانات كافية",
        });
      }

      // 2. تحويل البيانات إلى نص
      const headers = rawData[0];
      const rows = rawData.slice(1).filter(r => r.some(c => c !== ""));
      const csvText = [
        headers.join(" | "),
        ...rows.map(r => r.join(" | ")),
      ].join("\n");

      // 3. جلب الخيارات الديناميكية من قاعدة البيانات
      const opts = await fetchParsedOptions();
      const optionsSummary = buildOptionsSummary(opts);

      // نطاقات المقاسات من الـ store
      const customDimGroup = opts.dimGroups.find(
        g => g.id === "custom_dimensions"
      );
      const widthMin = customDimGroup?.min ?? 50;
      const widthMax = customDimGroup?.max ?? 200;
      const heightMin = 150;
      const heightMax = 300;

      // 4. استخراج البيانات بالذكاء الاصطناعي
      let parsedItems: any[] = [];
      let aiError: string | null = null;

      try {
        const systemPrompt = `أنت مساعد متخصص في استخراج بيانات طلبات الأبواب من ملفات Excel.
مهمتك: تحليل البيانات وإرجاع مصفوفة JSON من البنود.

خيارات المنتج المتاحة في النظام:
${optionsSummary}

تعليمات المطابقة:
- لحقل "woodType" (مادة الباب): طابق القيمة المدخلة مع قائمة المواد المتاحة أعلاه. إذا كانت القيمة قريبة من أحد الخيارات (مثلاً "خشب طبيعي" → "خشب")، استخدم الخيار المتاح. إذا لم تجد تطابقاً، استخدم القيمة كما هي وضع valid=false.
- لحقل "color" (اللون): طابق مع قائمة الألوان المتاحة. إذا كانت القيمة قريبة (مثلاً "بني داكن" → "جوز داكن")، استخدم الخيار المتاح.
- لحقل "doorType" (نوع الباب): استخدم القيمة الموجودة في الملف كما هي.
- العرض يجب أن يكون بين ${widthMin} و${widthMax} سم.
- الارتفاع يجب أن يكون بين ${heightMin} و${heightMax} سم.
- السماكة بين 3 و8 سم (افتراضي: 4).
- الكمية يجب أن تكون رقماً موجباً.
- إذا كانت القيمة غير موجودة أو غير واضحة، ضع null.
- أرجع فقط JSON بدون أي نص إضافي.`;

        const userPrompt = `بيانات Excel:
${csvText}

أرجع مصفوفة JSON بهذا الشكل:
[{
  "doorType": "نوع الباب",
  "woodType": "مادة الباب (من القائمة المتاحة)",
  "color": "اللون (من القائمة المتاحة)",
  "width": 90,
  "height": 210,
  "thickness": 4,
  "quantity": 1,
  "unitPrice": 0,
  "notes": "ملاحظات",
  "valid": true,
  "error": null,
  "selections": {}
}]`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "excel_items",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        doorType: { type: "string" },
                        woodType: { type: ["string", "null"] },
                        color: { type: ["string", "null"] },
                        width: { type: "number" },
                        height: { type: "number" },
                        thickness: { type: "number" },
                        quantity: { type: "number" },
                        unitPrice: { type: "number" },
                        notes: { type: ["string", "null"] },
                        valid: { type: "boolean" },
                        error: { type: ["string", "null"] },
                        selections: {
                          type: "object",
                          additionalProperties: { type: "string" },
                        },
                      },
                      required: [
                        "doorType",
                        "width",
                        "height",
                        "thickness",
                        "quantity",
                        "unitPrice",
                        "valid",
                        "error",
                        "selections",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          parsedItems = (parsed.items || []).map((item: any, idx: number) => {
            // مطابقة ذكية للمادة واللون مع الخيارات المتاحة
            const matchedMaterial = item.woodType
              ? fuzzyMatch(item.woodType, opts.materials)
              : null;
            const matchedColor = item.color
              ? fuzzyMatch(item.color, opts.colors)
              : null;

            // تحقق من المقاسات
            const widthOk = item.width >= widthMin && item.width <= widthMax;
            const heightOk =
              item.height >= heightMin && item.height <= heightMax;
            const qtyOk = item.quantity > 0;

            // تحقق من صحة المادة واللون
            const materialOk = !item.woodType || matchedMaterial !== null;
            const colorOk = !item.color || matchedColor !== null;

            let errorMsg: string | null = item.error;
            if (!widthOk)
              errorMsg = `العرض ${item.width} سم خارج النطاق (${widthMin}-${widthMax})`;
            else if (!heightOk)
              errorMsg = `الارتفاع ${item.height} سم خارج النطاق (${heightMin}-${heightMax})`;
            else if (!qtyOk) errorMsg = "الكمية يجب أن تكون أكبر من صفر";
            else if (!materialOk)
              errorMsg = `مادة الباب "${item.woodType}" غير متاحة. الخيارات: ${opts.materials.map(m => m.label).join(", ")}`;
            else if (!colorOk)
              errorMsg = `اللون "${item.color}" غير متاح. الخيارات: ${opts.colors
                .filter(c => c.id !== "custom")
                .map(c => c.label)
                .join(", ")}`;

            const isValid =
              item.valid &&
              widthOk &&
              heightOk &&
              qtyOk &&
              materialOk &&
              colorOk;

            return {
              id: `excel-${idx}-${Date.now()}`,
              doorType: item.doorType || "غير محدد",
              woodType: matchedMaterial
                ? matchedMaterial.label
                : item.woodType || "",
              woodTypeId: matchedMaterial?.id || null,
              color: matchedColor ? matchedColor.label : item.color || "",
              colorId: matchedColor?.id || null,
              colorHex: matchedColor?.hex || "#C8A96E",
              width: item.width,
              height: item.height,
              thickness: item.thickness || 4,
              quantity: item.quantity,
              unitPrice: item.unitPrice || 0,
              notes: item.notes || "",
              selections: item.selections || {},
              valid: isValid,
              error: isValid ? null : errorMsg,
              // بيانات المطابقة للعرض في الواجهة
              matchInfo: {
                materialMatched: matchedMaterial !== null,
                colorMatched: matchedColor !== null,
                originalMaterial: item.woodType,
                originalColor: item.color,
              },
            };
          });
        }
      } catch (err: any) {
        aiError =
          "تعذّر تحليل الملف بالذكاء الاصطناعي. يرجى مراجعة البيانات يدوياً.";
        // fallback: تحليل بسيط مع مطابقة الخيارات
        parsedItems = rows.slice(0, 100).map((row, idx) => {
          const get = (i: number) => String(row[i] || "").trim();
          const num = (i: number, def = 0) => parseFloat(get(i)) || def;

          const rawMaterial = get(1);
          const rawColor = get(2);
          const matchedMaterial = rawMaterial
            ? fuzzyMatch(rawMaterial, opts.materials)
            : null;
          const matchedColor = rawColor
            ? fuzzyMatch(rawColor, opts.colors)
            : null;

          return {
            id: `excel-${idx}-${Date.now()}`,
            doorType: get(0) || "غير محدد",
            woodType: matchedMaterial ? matchedMaterial.label : rawMaterial,
            woodTypeId: matchedMaterial?.id || null,
            color: matchedColor ? matchedColor.label : rawColor,
            colorId: matchedColor?.id || null,
            colorHex: matchedColor?.hex || "#C8A96E",
            width: num(3, 90),
            height: num(4, 210),
            thickness: num(5, 4),
            quantity: Math.max(1, num(6, 1)),
            unitPrice: num(7, 0),
            notes: get(8) || "",
            selections: {},
            valid: true,
            error: null,
            matchInfo: {
              materialMatched: matchedMaterial !== null,
              colorMatched: matchedColor !== null,
              originalMaterial: rawMaterial,
              originalColor: rawColor,
            },
          };
        });
      }

      return {
        items: parsedItems,
        totalRows: rows.length,
        validCount: parsedItems.filter(i => i.valid).length,
        errorCount: parsedItems.filter(i => !i.valid).length,
        aiError,
        fileName: input.fileName,
        // إرجاع الخيارات المتاحة للواجهة لاستخدامها في نموذج التعديل
        availableOptions: {
          materials: opts.materials.map(m => ({ id: m.id, label: m.label })),
          colors: opts.colors.map(c => ({
            id: c.id,
            label: c.label,
            hex: c.hex,
          })),
          shapes: opts.shapes.map(s => ({ id: s.id, label: s.label })),
        },
      };
    }),

  // ── توليد قالب Excel ديناميكي ─────────────────────────────────────────────
  generateTemplate: publicProcedure.mutation(async () => {
    const opts = await fetchParsedOptions();

    const materials = opts.materials.map(m => m.label);
    const colors = opts.colors.filter(c => c.id !== "custom").map(c => c.label);
    const shapes = opts.shapes.map(s => s.label);

    // نطاقات المقاسات
    const customDimGroup = opts.dimGroups.find(
      g => g.id === "custom_dimensions"
    );
    const standardGroup = opts.dimGroups.find(g => g.id === "standard_sizes");
    const widthMin = customDimGroup?.min ?? 50;
    const widthMax = customDimGroup?.max ?? 200;
    const standardSizes = standardGroup?.values
      .filter(v => v.enabled)
      .map(v => v.label) ?? ["90×210 سم", "100×210 سم", "80×200 سم"];

    // بناء ورقة Excel الرئيسية
    const wb = XLSX.utils.book_new();

    const mainData: any[][] = [
      // رأس الجدول
      [
        "نوع الباب *",
        "مادة الباب",
        "اللون",
        "العرض (سم) *",
        "الارتفاع (سم) *",
        "السماكة (سم)",
        "الكمية *",
        "سعر الوحدة",
        "ملاحظات",
      ],
      // صفوف مثال
      [
        materials[0] ?? "WPC",
        materials[0] ?? "WPC",
        colors[0] ?? "أبيض",
        90,
        210,
        4,
        5,
        0,
        "مثال: مشروع فيلا الرياض",
      ],
      [
        materials[1] ?? "خشب",
        materials[1] ?? "خشب",
        colors[1] ?? "جوز داكن",
        100,
        210,
        4,
        2,
        0,
        "",
      ],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(mainData);
    ws["!cols"] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "الطلب");

    // ورقة القيم المرجعية (ديناميكية بالكامل)
    const maxRows = Math.max(
      materials.length,
      colors.length,
      shapes.length,
      standardSizes.length
    );
    const refHeaders = [
      "مواد الباب المتاحة",
      "الألوان المتاحة",
      "أشكال الباب",
      "المقاسات القياسية",
      "ملاحظات",
    ];
    const refData: any[][] = [refHeaders];

    for (let i = 0; i < maxRows; i++) {
      refData.push([
        materials[i] ?? "",
        colors[i] ?? "",
        shapes[i] ?? "",
        standardSizes[i] ?? "",
        i === 0
          ? `العرض: ${widthMin}-${widthMax} سم`
          : i === 1
            ? "الارتفاع: 150-300 سم"
            : i === 2
              ? "السماكة: 3-8 سم"
              : "",
      ]);
    }

    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    wsRef["!cols"] = [
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRef, "القيم المرجعية");

    // ورقة التعليمات
    const instrData: any[][] = [
      ["تعليمات ملء النموذج"],
      [""],
      ["الحقول الإلزامية (*):", "نوع الباب، العرض، الارتفاع، الكمية"],
      ["مادة الباب:", `اختر من: ${materials.join(", ")}`],
      ["اللون:", `اختر من: ${colors.join(", ")}`],
      ["العرض:", `بين ${widthMin} و${widthMax} سم`],
      ["الارتفاع:", "بين 150 و300 سم"],
      ["السماكة:", "بين 3 و8 سم (افتراضي: 4)"],
      ["الكمية:", "رقم موجب"],
      [""],
      ["ملاحظة:", "يمكن ترك حقل السعر فارغاً وسيتم تحديده من قِبل الإدارة"],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr["!cols"] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, "التعليمات");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = buffer.toString("base64");
    return { base64, fileName: "sindian_order_template.xlsx" };
  }),
});

// ── Export ────────────────────────────────────────────────────────────────────
export { productOptionsRouter, distributorOrdersRouter };
