// ============================================================
// inventoryStore.ts - مخزن مشترك لبيانات المخزون
// يُستخدم من AdminInventory وCreateWorkOrderWizard معاً
// ============================================================

import type { InventoryItem, InventoryTransaction, MaterialCategory } from "@/pages/admin/AdminInventory";

// ─── مفتاح localStorage ───────────────────────────────────────
const STORAGE_KEY = "sindian_inventory_v1";

// ─── البيانات التجريبية الأولية ───────────────────────────────
const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: "INV-001", code: "WPC-45-WHT", name: "لوح WPC 45mm أبيض مطفي",
    nameEn: "WPC Board 45mm White Matt", category: "wpc_board",
    unit: "لوح", currentQty: 320, minQty: 100, maxQty: 600, reorderQty: 200,
    unitCost: 85, supplier: "شركة البلاستيك المتحدة", supplierPhone: "0501234567",
    location: "مستودع A - رف 1", lastReceived: "2026-05-10", lastConsumed: "2026-05-17",
    status: "in_stock",
    transactions: [
      { id: "T1", type: "receive",  quantity: 200, balanceBefore: 120, balanceAfter: 320, reference: "PO-2026-0044", performedBy: "م. أحمد", date: "2026-05-10" },
      { id: "T2", type: "consume",  quantity: 48,  balanceBefore: 368, balanceAfter: 320, reference: "WO-2026-0101", performedBy: "خط الأبواب", date: "2026-05-17", note: "طلب شركة الإتقان" },
    ],
  },
  {
    id: "INV-002", code: "WPC-55-BEG", name: "لوح WPC 55mm بيج رملي",
    nameEn: "WPC Board 55mm Beige Sand", category: "wpc_board",
    unit: "لوح", currentQty: 78, minQty: 80, maxQty: 400, reorderQty: 150,
    unitCost: 95, supplier: "شركة البلاستيك المتحدة", supplierPhone: "0501234567",
    location: "مستودع A - رف 2", lastReceived: "2026-04-28", lastConsumed: "2026-05-15",
    status: "low_stock",
    transactions: [
      { id: "T3", type: "receive",  quantity: 150, balanceBefore: 0,   balanceAfter: 150, reference: "PO-2026-0038", performedBy: "م. أحمد", date: "2026-04-28" },
      { id: "T4", type: "consume",  quantity: 72,  balanceBefore: 150, balanceAfter: 78,  reference: "WO-2026-0098", performedBy: "خط الأبواب", date: "2026-05-15" },
    ],
  },
  {
    id: "INV-003", code: "FILM-WHT-50", name: "فيلم PVC أبيض مطفي 50 ميكرون",
    nameEn: "PVC Film White Matt 50 Micron", category: "film",
    unit: "رول", currentQty: 45, minQty: 20, maxQty: 100, reorderQty: 40,
    unitCost: 320, supplier: "مؤسسة الأفلام الصناعية", supplierPhone: "0551234567",
    location: "مستودع B - رف 1", lastReceived: "2026-05-05", lastConsumed: "2026-05-16",
    status: "in_stock",
    transactions: [
      { id: "T5", type: "receive",  quantity: 30, balanceBefore: 15, balanceAfter: 45, reference: "PO-2026-0040", performedBy: "م. سعد", date: "2026-05-05" },
    ],
  },
  {
    id: "INV-004", code: "EDGE-ABS-WHT", name: "حافة ABS أبيض 2mm",
    nameEn: "ABS Edge White 2mm", category: "edge",
    unit: "متر", currentQty: 1200, minQty: 500, maxQty: 3000, reorderQty: 1000,
    unitCost: 4.5, supplier: "شركة الحواف الصناعية", supplierPhone: "0561234567",
    location: "مستودع B - رف 3", lastReceived: "2026-05-08", lastConsumed: "2026-05-18",
    status: "in_stock",
    transactions: [
      { id: "T6", type: "receive",  quantity: 800, balanceBefore: 400, balanceAfter: 1200, reference: "PO-2026-0041", performedBy: "م. أحمد", date: "2026-05-08" },
    ],
  },
  {
    id: "INV-005", code: "FRAME-MDF-90", name: "إطار MDF 90mm أبيض",
    nameEn: "MDF Frame 90mm White", category: "frame",
    unit: "قطعة", currentQty: 12, minQty: 50, maxQty: 300, reorderQty: 100,
    unitCost: 45, supplier: "مصنع الإطارات الخليجي", supplierPhone: "0571234567",
    location: "مستودع C - رف 1", lastReceived: "2026-04-20", lastConsumed: "2026-05-14",
    status: "critical",
    transactions: [
      { id: "T7", type: "receive",  quantity: 100, balanceBefore: 0,   balanceAfter: 100, reference: "PO-2026-0030", performedBy: "م. فهد", date: "2026-04-20" },
      { id: "T8", type: "consume",  quantity: 88,  balanceBefore: 100, balanceAfter: 12,  reference: "WO-2026-0095", performedBy: "خط الإطارات", date: "2026-05-14" },
    ],
  },
  {
    id: "INV-006", code: "LOCK-MOR-STD", name: "قفل مورتيز قياسي",
    nameEn: "Mortise Lock Standard", category: "lock",
    unit: "طقم", currentQty: 0, minQty: 30, maxQty: 200, reorderQty: 80,
    unitCost: 65, supplier: "شركة الأقفال العالمية", supplierPhone: "0581234567",
    location: "مستودع D - رف 1", lastReceived: "2026-04-15", lastConsumed: "2026-05-12",
    status: "out_of_stock",
    transactions: [
      { id: "T9",  type: "receive",  quantity: 80, balanceBefore: 0,  balanceAfter: 80, reference: "PO-2026-0028", performedBy: "م. خالد", date: "2026-04-15" },
      { id: "T10", type: "consume",  quantity: 80, balanceBefore: 80, balanceAfter: 0,  reference: "WO-2026-0093", performedBy: "قسم الإكسسوارات", date: "2026-05-12" },
    ],
  },
  {
    id: "INV-007", code: "HINGE-3-STD", name: "مفصلات 3 مفصلات قياسية",
    nameEn: "3-Hinge Set Standard", category: "hinge",
    unit: "طقم", currentQty: 156, minQty: 60, maxQty: 400, reorderQty: 120,
    unitCost: 28, supplier: "مؤسسة المفصلات الصناعية", supplierPhone: "0591234567",
    location: "مستودع D - رف 2", lastReceived: "2026-05-01", lastConsumed: "2026-05-17",
    status: "in_stock",
    transactions: [
      { id: "T11", type: "receive",  quantity: 200, balanceBefore: 0,   balanceAfter: 200, reference: "PO-2026-0035", performedBy: "م. عبدالله", date: "2026-05-01" },
      { id: "T12", type: "consume",  quantity: 44,  balanceBefore: 200, balanceAfter: 156, reference: "WO-2026-0099", performedBy: "قسم الإكسسوارات", date: "2026-05-17" },
    ],
  },
  {
    id: "INV-008", code: "PACK-FOAM-STD", name: "فوم تغليف قياسي",
    nameEn: "Standard Packing Foam", category: "packaging",
    unit: "قطعة", currentQty: 280, minQty: 100, maxQty: 600, reorderQty: 200,
    unitCost: 8, supplier: "مصنع التغليف الحديث", supplierPhone: "0501111222",
    location: "مستودع E - رف 1", lastReceived: "2026-05-12", lastConsumed: "2026-05-18",
    status: "in_stock",
    transactions: [
      { id: "T13", type: "receive",  quantity: 300, balanceBefore: 0,   balanceAfter: 300, reference: "PO-2026-0043", performedBy: "م. محمد", date: "2026-05-12" },
      { id: "T14", type: "consume",  quantity: 20,  balanceBefore: 300, balanceAfter: 280, reference: "WO-2026-0100", performedBy: "قسم التغليف", date: "2026-05-18" },
    ],
  },
];

// ─── حساب الحالة بناءً على الكمية ─────────────────────────────
function calcStatus(item: InventoryItem): InventoryItem["status"] {
  if (item.currentQty <= 0) return "out_of_stock";
  if (item.currentQty <= item.minQty * 0.5) return "critical";
  if (item.currentQty <= item.minQty) return "low_stock";
  return "in_stock";
}

// ─── تحميل البيانات من localStorage أو الأولية ────────────────
function loadItems(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as InventoryItem[];
  } catch { /* ignore */ }
  return INITIAL_ITEMS;
}

// ─── حفظ البيانات في localStorage ─────────────────────────────
function saveItems(items: InventoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

// ─── واجهة الاستهلاك لأمر التشغيل ────────────────────────────
export interface MaterialConsumption {
  materialId: string;
  materialCode: string;
  materialName: string;
  category: MaterialCategory;
  unit: string;
  required: number;       // الكمية المطلوبة
  available: number;      // الكمية المتوفرة
  sufficient: boolean;    // هل الكمية كافية؟
  shortage: number;       // كمية النقص (0 إذا كافية)
}

// ─── حساب المواد المطلوبة من أمر التشغيل ─────────────────────
export interface WorkOrderDoorSummary {
  totalDoors: number;
  doorColors: string[];
  frameColors: string[];
  lockTypes: string[];
  hingeTypes: string[];
  edgeTypes: string[];
  hasFilm: boolean;
}

export function calcRequiredMaterials(summary: WorkOrderDoorSummary): Array<{
  category: MaterialCategory;
  requiredQty: number;
  description: string;
}> {
  const { totalDoors } = summary;
  const requirements: Array<{ category: MaterialCategory; requiredQty: number; description: string }> = [];

  // ألواح WPC: كل باب يحتاج ~2 لوح
  requirements.push({ category: "wpc_board", requiredQty: totalDoors * 2, description: `${totalDoors} باب × 2 لوح` });

  // أفلام: إذا كان هناك أبواب بفيلم
  if (summary.hasFilm) {
    requirements.push({ category: "film", requiredQty: Math.ceil(totalDoors * 0.5), description: `${totalDoors} باب × 0.5 رول` });
  }

  // حواف ABS: كل باب يحتاج ~8 متر
  const absCount = summary.edgeTypes.filter(e => e === "ABS" || e === "abs").length;
  if (absCount > 0 || summary.edgeTypes.length === 0) {
    requirements.push({ category: "edge", requiredQty: totalDoors * 8, description: `${totalDoors} باب × 8 متر` });
  }

  // إطارات: كل باب يحتاج إطار واحد
  requirements.push({ category: "frame", requiredQty: totalDoors, description: `${totalDoors} باب × 1 إطار` });

  // أقفال: كل باب يحتاج طقم قفل واحد
  requirements.push({ category: "lock", requiredQty: totalDoors, description: `${totalDoors} باب × 1 طقم قفل` });

  // مفصلات: كل باب يحتاج طقم مفصلات واحد
  requirements.push({ category: "hinge", requiredQty: totalDoors, description: `${totalDoors} باب × 1 طقم مفصلات` });

  // مواد تغليف: كل باب يحتاج قطعة فوم
  requirements.push({ category: "packaging", requiredQty: totalDoors, description: `${totalDoors} باب × 1 قطعة فوم` });

  return requirements;
}

// ─── فحص توفر المواد ─────────────────────────────────────────
export function checkMaterialAvailability(summary: WorkOrderDoorSummary): MaterialConsumption[] {
  const items = loadItems();
  const requirements = calcRequiredMaterials(summary);
  const result: MaterialConsumption[] = [];

  for (const req of requirements) {
    // أخذ أول مادة من هذه الفئة كمرجع (يمكن تطويرها لاحقاً لاختيار أكثر من مادة)
    const match = items.find(i => i.category === req.category);
    if (!match) continue;

    const sufficient = match.currentQty >= req.requiredQty;
    result.push({
      materialId: match.id,
      materialCode: match.code,
      materialName: match.name,
      category: match.category,
      unit: match.unit,
      required: req.requiredQty,
      available: match.currentQty,
      sufficient,
      shortage: sufficient ? 0 : req.requiredQty - match.currentQty,
    });
  }

  return result;
}

// ─── تنفيذ الخصم التلقائي ────────────────────────────────────
export function consumeMaterialsForWorkOrder(
  summary: WorkOrderDoorSummary,
  workOrderRef: string,
  performedBy: string = "نظام أوامر التشغيل"
): { success: boolean; consumed: MaterialConsumption[]; warnings: string[] } {
  const items = loadItems();
  const requirements = calcRequiredMaterials(summary);
  const consumed: MaterialConsumption[] = [];
  const warnings: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const req of requirements) {
    const idx = items.findIndex(i => i.category === req.category);
    if (idx === -1) {
      warnings.push(`لا توجد مادة من فئة "${req.category}" في المخزون`);
      continue;
    }

    const item = items[idx];
    const balanceBefore = item.currentQty;
    const actualConsume = Math.min(req.requiredQty, item.currentQty);
    const newQty = item.currentQty - actualConsume;

    // إضافة حركة الاستهلاك
    const tx: InventoryTransaction = {
      id: `TX-${Date.now()}-${idx}`,
      type: "consume",
      quantity: actualConsume,
      balanceBefore,
      balanceAfter: newQty,
      reference: workOrderRef,
      note: req.description,
      performedBy,
      date: today,
    };

    items[idx] = {
      ...item,
      currentQty: newQty,
      lastConsumed: today,
      status: calcStatus({ ...item, currentQty: newQty }),
      transactions: [...item.transactions, tx],
    };

    consumed.push({
      materialId: item.id,
      materialCode: item.code,
      materialName: item.name,
      category: item.category,
      unit: item.unit,
      required: req.requiredQty,
      available: balanceBefore,
      sufficient: balanceBefore >= req.requiredQty,
      shortage: balanceBefore >= req.requiredQty ? 0 : req.requiredQty - balanceBefore,
    });

    if (balanceBefore < req.requiredQty) {
      warnings.push(`${item.name}: تم خصم ${actualConsume} ${item.unit} فقط (النقص: ${req.requiredQty - balanceBefore} ${item.unit})`);
    }

    // تنبيه إذا وصل المخزون لمستوى منخفض بعد الخصم
    if (newQty <= item.minQty && newQty > 0) {
      warnings.push(`تنبيه: ${item.name} وصل لمستوى منخفض (${newQty} ${item.unit})`);
    }
  }

  saveItems(items);
  return { success: true, consumed, warnings };
}

// ─── API عام للمخزون ─────────────────────────────────────────
export const inventoryStore = {
  getItems: loadItems,
  saveItems,
  checkAvailability: checkMaterialAvailability,
  consumeForWorkOrder: consumeMaterialsForWorkOrder,
  calcRequirements: calcRequiredMaterials,
};

export default inventoryStore;
