import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Layers,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

interface BOMFormProps {
  editBomId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface SelectedItem {
  itemId: number;
  itemName: string;
  itemCode: string;
  unit: string;
  unitCost: number;
  quantity: number;
  notes: string;
}

export function BOMForm({ editBomId, onSuccess, onCancel }: BOMFormProps) {
  const [productId, setProductId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [laborCost, setLaborCost] = useState(0);
  const [wastagePercentage, setWastagePercentage] = useState(5);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState("");

  const [itemSearch, setItemSearch] = useState("");
  const [showItemResults, setShowItemResults] = useState(false);

  // جلب المنتجات والمواد من المخزن
  const { data: products = [], isLoading: isLoadingProducts } = trpc.products.list.useQuery();
  const { data: inventoryItems = [], isLoading: isLoadingInventory } = trpc.inventory.list.useQuery();

  // جلب بيانات الـ BOM عند التعديل
  const { data: existingBOM, isLoading: isLoadingExisting } = trpc.bom.get.useQuery(
    { bomId: editBomId! },
    { enabled: !!editBomId }
  );

  // ملء الحقول عند التعديل
  useEffect(() => {
    if (existingBOM) {
      setProductId(existingBOM.productId);
      setDescription(existingBOM.description || "");
      setLaborCost(existingBOM.laborCost);
      setWastagePercentage(existingBOM.wastagePercentage);
      setNotes(existingBOM.notes || "");
      
      const mapped = existingBOM.items.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        unit: item.itemUnit,
        unitCost: item.unitCost,
        quantity: item.quantity,
        notes: item.notes || "",
      }));
      setSelectedItems(mapped);
    }
  }, [existingBOM]);

  const createMutation = trpc.bom.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء جدول المكونات (BOM) بنجاح");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(`فشل إنشاء جدول المكونات: ${err.message}`);
    },
  });

  const updateMutation = trpc.bom.update.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث جدول المكونات (BOM) بنجاح");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(`فشل تحديث جدول المكونات: ${err.message}`);
    },
  });

  // تصفية المواد للبحث
  const filteredInventoryItems = inventoryItems.filter(item => {
    if (!itemSearch) return false;
    const s = itemSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(s) ||
      item.code.toLowerCase().includes(s)
    );
  });

  const handleAddItem = (item: typeof inventoryItems[0]) => {
    // التحقق مما إذا كانت المادة مضافة بالفعل
    if (selectedItems.some(i => i.itemId === item.id)) {
      toast.error("هذه المادة مضافة بالفعل في القائمة");
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        itemId: item.id,
        itemName: item.name,
        itemCode: item.code,
        unit: item.unit,
        unitCost: item.unitCost,
        quantity: 1,
        notes: "",
      },
    ]);
    setItemSearch("");
    setShowItemResults(false);
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter(i => i.itemId !== itemId));
  };

  const handleUpdateQty = (itemId: number, qty: number) => {
    setSelectedItems(
      selectedItems.map(item =>
        item.itemId === itemId ? { ...item, quantity: Math.max(0.001, qty) } : item
      )
    );
  };

  const handleUpdateItemNotes = (itemId: number, textVal: string) => {
    setSelectedItems(
      selectedItems.map(item =>
        item.itemId === itemId ? { ...item, notes: textVal } : item
      )
    );
  };

  // الحسابات التلقائية بالواجهة
  const totalItemsCost = selectedItems.reduce(
    (sum, item) => sum + item.unitCost * item.quantity,
    0
  );
  const wastageAmount = totalItemsCost * (wastagePercentage / 100);
  const totalCost = totalItemsCost + wastageAmount + laborCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("يرجى تحديد المنتج أولاً");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("يرجى إضافة مادة واحدة على الأقل لقائمة المكونات");
      return;
    }

    const payload = {
      description: description || undefined,
      laborCost,
      wastagePercentage,
      notes: notes || undefined,
      items: selectedItems.map(i => ({
        itemId: i.itemId,
        quantity: i.quantity,
        notes: i.notes || undefined,
      })),
    };

    if (editBomId) {
      updateMutation.mutate({
        bomId: editBomId,
        ...payload,
      });
    } else {
      createMutation.mutate({
        productId,
        ...payload,
      });
    }
  };

  if (editBomId && isLoadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
        <p className="text-sm">جاري تحميل بيانات قائمة المواد...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
      <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* المنتج */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              المنتج المستهدف <span className="text-red-500">*</span>
            </label>
            <select
              disabled={!!editBomId || isLoadingProducts}
              value={productId || ""}
              onChange={e => setProductId(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
            >
              <option value="">-- اختر المنتج --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* الوصف */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              وصف قائمة المكونات
            </label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="مثال: الباب القياسي بدون أكسسوارات إضافية"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* تكلفة العمالة */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
              تكلفة العمالة والتصنيع (ر.س)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={laborCost}
              onChange={e => setLaborCost(Math.max(0, parseFloat(e.target.value) || 0))}
              className="rounded-xl"
            />
          </div>

          {/* نسبة الهدر */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
              نسبة الهدر المتوقعة (%)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={wastagePercentage}
              onChange={e => setWastagePercentage(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* إضافة المواد من المخزن */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-600" />
          مكونات قائمة المواد (المواد الخام)
        </h3>

        <div className="relative">
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="ابحث عن مادة خام بالاسم أو الرمز لإضافتها (مثل: خشب، مقابض، مفصلات)..."
              value={itemSearch}
              onChange={e => {
                setItemSearch(e.target.value);
                setShowItemResults(true);
              }}
              onFocus={() => setShowItemResults(true)}
            />
          </div>

          {/* نتائج بحث المواد الخام */}
          {showItemResults && itemSearch && (
            <div className="absolute z-20 w-full mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50">
              {filteredInventoryItems.length > 0 ? (
                filteredInventoryItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-bold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">الرمز: {item.code} · الفئة: {item.category}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">{item.unit}</span>
                      <span className="font-bold text-emerald-600">{item.unitCost.toFixed(2)} ر.س</span>
                      <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-gray-400">لا توجد مواد تطابق البحث</div>
              )}
            </div>
          )}
        </div>

        {/* جدول المواد المختارة */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 text-gray-500 font-bold text-xs">
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-right">المادة</th>
                <th className="px-4 py-3 text-right">سعر الوحدة</th>
                <th className="px-4 py-3 text-right w-28">الكمية المطلوبة</th>
                <th className="px-4 py-3 text-right">التكلفة الإجمالية</th>
                <th className="px-4 py-3 text-right">ملاحظات البند</th>
                <th className="px-4 py-3 text-center w-12">🗑️</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {selectedItems.length > 0 ? (
                selectedItems.map(item => (
                  <tr key={item.itemId} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{item.itemName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">الرمز: {item.itemCode}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {item.unitCost.toFixed(2)} ر.س <span className="text-xs text-gray-400">/ {item.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={item.quantity}
                          onChange={e => handleUpdateQty(item.itemId, parseFloat(e.target.value) || 0)}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-400">{item.unit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {(item.unitCost * item.quantity).toFixed(2)} ر.س
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="إضافة ملاحظات لهذا البند..."
                        value={item.notes}
                        onChange={e => handleUpdateItemNotes(item.itemId, e.target.value)}
                        className="w-full border-none focus:outline-none text-xs text-gray-500 bg-transparent placeholder-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.itemId)}
                        className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs">
                    <AlertCircle className="w-5 h-5 mx-auto mb-2 text-gray-300" />
                    لم يتم إضافة أي مواد بعد. استخدم شريط البحث أعلاه للبحث وإضافة المكونات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ملاحظات عامة */}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          ملاحظات عامة حول قائمة المواد
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="يرجى كتابة أي ملاحظات إضافية هنا..."
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </div>

      {/* خلاصة التكاليف */}
      <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-6 text-center sm:text-right w-full sm:w-auto">
          <div>
            <div className="text-xs text-gray-400">إجمالي المواد</div>
            <div className="font-bold text-gray-700 mt-1">{totalItemsCost.toFixed(2)} ر.س</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">الهدر المضاف ({wastagePercentage}%)</div>
            <div className="font-bold text-gray-700 mt-1">{wastageAmount.toFixed(2)} ر.س</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">تكلفة التصنيع</div>
            <div className="font-bold text-gray-700 mt-1">{laborCost.toFixed(2)} ر.س</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-r border-emerald-200/50 pt-4 sm:pt-0 sm:pr-6 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="text-xs text-emerald-800/70 font-bold flex items-center gap-1 justify-end">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              التكلفة الإجمالية المقدرة
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {totalCost.toFixed(2)} ر.س
            </div>
          </div>
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            "حفظ قائمة المواد"
          )}
        </Button>
      </div>
    </form>
  );
}
