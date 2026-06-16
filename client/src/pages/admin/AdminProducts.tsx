// ============================================================
// AdminProducts - إدارة المنتجات والكتالوج (DB-backed via tRPC)
// ============================================================
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Search,
  Plus,
  Package,
  Edit2,
  Archive,
  X,
  CheckCircle2,
  Tag,
  Save,
  Copy,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────
type ProductStatus = "active" | "archived";

interface Product {
  id: string;
  sku: string;
  name: string;
  nameEn: string;
  category: string;
  subcategory: string;
  woodType: string;
  status: ProductStatus;
  basePrice: number;
  distributorPrice: number;
  sizes: string[];
  colors: string[];
  stock: number;
  description: string;
  image: string;
  options?: string[] | null; // IDs of allowed order-option sections
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  interior: { label: "داخلي", color: "#10B981" },
  exterior: { label: "خارجي", color: "#3B82F6" },
  fire: { label: "مقاوم للحريق", color: "#EF4444" },
  acoustic: { label: "عازل للصوت", color: "#8B5CF6" },
  accessories: { label: "مستلزمات", color: "#F59E0B" },
};

// ─── Product Form Modal ───────────────────────────────────────
function ProductFormModal({
  product,
  onClose,
  onSaved,
}: {
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const isEdit = !!product;

  const [form, setForm] = useState({
    name: product?.name ?? "",
    nameEn: product?.nameEn ?? "",
    category: product?.category ?? "interior",
    basePrice: product?.basePrice ?? 0,
    distributorPrice: product?.distributorPrice ?? 0,
    stock: product?.stock ?? 0,
    description: product?.description ?? "",
    image: product?.image ?? "",
    sizes: (product?.sizes ?? []).join("، "),
    colors: (product?.colors ?? []).join("، "),
    options: (product?.options as string[] | null) ?? ([] as string[]),
  });

  const { data: globalSections } = trpc.productOptions.get.useQuery();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success(isRtl ? "تم إضافة المنتج" : "Product added");
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success(isRtl ? "تم تحديث المنتج" : "Product updated");
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(isRtl ? "أدخل اسم المنتج" : "Enter product name");
      return;
    }
    if (form.basePrice <= 0) {
      toast.error(isRtl ? "أدخل سعراً صحيحاً" : "Enter valid price");
      return;
    }
    const payload = {
      ...form,
      sku: product?.sku ?? `SND-NEW-${Date.now()}`,
      sizes: form.sizes
        .split(/[،,]/)
        .map((s: string) => s.trim())
        .filter(Boolean),
      colors: form.colors
        .split(/[،,]/)
        .map((c: string) => c.trim())
        .filter(Boolean),
      options: form.options.length > 0 ? form.options : null,
    };
    if (isEdit) {
      updateMutation.mutate({ id: parseInt(product!.id), ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          dir={dir}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "oklch(0.95 0.02 160)" }}
              >
                <Package
                  className="w-4 h-4"
                  style={{ color: "oklch(0.38 0.06 160)" }}
                />
              </div>
              <h2
                className="font-bold text-gray-900"
                style={{ fontFamily: "DM Serif Display, serif" }}
              >
                {isEdit
                  ? isRtl
                    ? "تعديل المنتج"
                    : "Edit Product"
                  : isRtl
                    ? "إضافة منتج جديد"
                    : "Add New Product"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {isRtl ? "الاسم بالعربية *" : "Arabic Name *"}
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {isRtl ? "الاسم بالإنجليزية" : "English Name"}
                </label>
                <input
                  value={form.nameEn}
                  onChange={e => setForm({ ...form, nameEn: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                {isRtl ? "الفئة" : "Category"}
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORIES) as string[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setForm({ ...form, category: cat })}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all border"
                    style={
                      form.category === cat
                        ? {
                            background: CATEGORIES[cat].color,
                            color: "white",
                            borderColor: CATEGORIES[cat].color,
                          }
                        : {
                            background: "#F9FAFB",
                            color: "#6B7280",
                            borderColor: "#E5E7EB",
                          }
                    }
                  >
                    {CATEGORIES[cat].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {isRtl ? "سعر التجزئة *" : "Retail Price *"}
                </label>
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={e =>
                    setForm({ ...form, basePrice: +e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {isRtl ? "سعر الموزع *" : "Distributor Price *"}
                </label>
                <input
                  type="number"
                  value={form.distributorPrice}
                  onChange={e =>
                    setForm({ ...form, distributorPrice: +e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {isRtl ? "المخزون" : "Stock"}
                </label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: +e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {isRtl ? "المقاسات (مفصولة بفاصلة)" : "Sizes (comma-separated)"}
              </label>
              <input
                value={form.sizes}
                onChange={e => setForm({ ...form, sizes: e.target.value })}
                placeholder="90×210، 100×220"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {isRtl ? "الألوان (مفصولة بفاصلة)" : "Colors (comma-separated)"}
              </label>
              <input
                value={form.colors}
                onChange={e => setForm({ ...form, colors: e.target.value })}
                placeholder={isRtl ? "جوزي، بلوط، أبيض" : "Walnut, Oak, White"}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {isRtl ? "رابط الصورة الرئيسية" : "Main Image URL"}
              </label>
              <input
                value={form.image}
                onChange={e => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {isRtl ? "الوصف" : "Description"}
              </label>
              <Textarea
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* ─── خيارات المنتج ─── */}
            {globalSections &&
              Array.isArray(globalSections) &&
              globalSections.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">
                    {isRtl
                      ? "أقسام خيارات الطلب المتاحة للعميل"
                      : "Available Order Option Sections"}
                  </label>
                  <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                    {(
                      globalSections as Array<{
                        id: string;
                        label: string;
                        icon: string;
                      }>
                    ).map(sec => {
                      const checked = form.options.includes(sec.id);
                      return (
                        <label
                          key={sec.id}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? form.options.filter(id => id !== sec.id)
                                : [...form.options, sec.id];
                              setForm({ ...form, options: next });
                            }}
                            className="w-4 h-4 accent-green-700"
                          />
                          <span className="text-base">{sec.icon}</span>
                          <span className="text-sm text-gray-700 group-hover:text-gray-900">
                            {sec.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {form.options.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {isRtl
                        ? "⚠️ لم يتم اختيار أي قسم — سيظهر جميع الأقسام المفعلة"
                        : "⚠️ No sections selected — all enabled sections will appear"}
                    </p>
                  )}
                </div>
              )}
          </div>

          <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 text-white"
              style={{ background: "oklch(0.38 0.06 160)" }}
            >
              <Save className="w-4 h-4" />
              {isSaving
                ? isRtl
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isEdit
                  ? isRtl
                    ? "حفظ التعديلات"
                    : "Save Changes"
                  : isRtl
                    ? "إضافة المنتج"
                    : "Add Product"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Copy Product Modal ───────────────────────────────────────
function CopyProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [newName, setNewName] = useState(`نسخة من ${product.name}`);
  const [newSku, setNewSku] = useState(`${product.sku}-COPY`);

  const duplicateMutation = trpc.products.duplicate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء نسخة المنتج بنجاح");
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleConfirm = () => {
    if (!newName.trim()) {
      toast.error("أدخل اسم المنتج الجديد");
      return;
    }
    if (!newSku.trim()) {
      toast.error("أدخل رمز SKU الجديد");
      return;
    }
    duplicateMutation.mutate({
      id: parseInt(product.id),
      name: newName.trim(),
      sku: newSku.trim(),
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          dir={dir}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(0.95 0.02 160)",
                  color: "oklch(0.38 0.06 160)",
                }}
              >
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <h2
                  className="font-bold text-gray-900 text-sm"
                  style={{ fontFamily: "DM Serif Display, serif" }}
                >
                  نسخ المنتج
                </h2>
                <p className="text-xs text-gray-400">
                  سيتم نسخ جميع البيانات مع تغيير الاسم والـ SKU
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                اسم المنتج الجديد *
              </label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                رمز SKU الجديد *
              </label>
              <input
                value={newSku}
                onChange={e => setNewSku(e.target.value)}
                dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={duplicateMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={duplicateMutation.isPending}
              className="gap-2 text-white"
              style={{ background: "oklch(0.38 0.06 160)" }}
            >
              <Copy className="w-4 h-4" />
              {duplicateMutation.isPending ? "جاري النسخ..." : "إنشاء النسخة"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AdminProducts() {
  const { dir } = useLanguage();
  const isRtl = dir === "rtl";
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>(
    undefined
  );
  const [showForm, setShowForm] = useState(false);
  const [copyProduct, setCopyProduct] = useState<Product | undefined>(
    undefined
  );

  const {
    data: allProducts = [],
    isLoading,
    refetch,
  } = trpc.products.adminList.useQuery();

  const updateStatusMutation = trpc.products.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(isRtl ? "تم تحديث حالة المنتج" : "Product status updated");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const seedMutation = trpc.products.seed.useMutation({
    onSuccess: (res: any) => {
      toast.success(
        `تم إضافة ${res.inserted} منتج، تم تخطي ${res.skipped} موجود مسبقاً`
      );
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (allProducts as Product[]).filter(p => {
    const matchSearch = p.name.includes(search) || p.sku.includes(search);
    const matchCat = filterCat === "all" || p.category === filterCat;
    const matchStatus = showArchived
      ? p.status === "archived"
      : p.status === "active";
    return matchSearch && matchCat && matchStatus;
  });

  const stats = {
    active: (allProducts as Product[]).filter(p => p.status === "active")
      .length,
    archived: (allProducts as Product[]).filter(p => p.status === "archived")
      .length,
    lowStock: (allProducts as Product[]).filter(
      p => p.status === "active" && p.stock > 0 && p.stock < 10
    ).length,
  };

  return (
    <AdminLayout
      title={isRtl ? "إدارة المنتجات" : "Manage Products"}
      subtitle={
        isRtl
          ? "إضافة وتعديل وأرشفة منتجات الكتالوج"
          : "Add, edit, and archive catalog products"
      }
    >
      <div className="space-y-5" dir={dir}>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: isRtl ? "منتجات نشطة" : "Active",
              value: stats.active,
              color: "#10B981",
              icon: <Package className="w-4 h-4" />,
            },
            {
              label: isRtl ? "مخزون منخفض" : "Low Stock",
              value: stats.lowStock,
              color: "#EF4444",
              icon: <Tag className="w-4 h-4" />,
            },
            {
              label: isRtl ? "مؤرشفة" : "Archived",
              value: stats.archived,
              color: "#6B7280",
              icon: <Archive className="w-4 h-4" />,
            },
          ].map(s => (
            <div
              key={s.label}
              className="bg-white rounded-xl p-4 border border-gray-100"
            >
              <div
                className="flex items-center gap-2 mb-2"
                style={{ color: s.color }}
              >
                {s.icon}
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              <div
                className="text-2xl font-bold"
                style={{
                  color: s.color,
                  fontFamily: "DM Serif Display, serif",
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                style={{ [isRtl ? "right" : "left"]: "12px" }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={
                  isRtl ? "بحث بالاسم أو SKU..." : "Search by name or SKU..."
                }
                className="w-full border border-gray-200 rounded-xl py-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                style={{
                  [isRtl ? "paddingRight" : "paddingLeft"]: "36px",
                  [isRtl ? "paddingLeft" : "paddingRight"]: "12px",
                }}
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {(["all", ...Object.keys(CATEGORIES)] as string[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className="text-xs px-3 py-2 rounded-xl font-medium transition-all"
                  style={
                    filterCat === cat
                      ? { background: "oklch(0.38 0.06 160)", color: "white" }
                      : { background: "#F3F4F6", color: "#6B7280" }
                  }
                >
                  {cat === "all"
                    ? isRtl
                      ? "الكل"
                      : "All"
                    : CATEGORIES[cat].label}
                </button>
              ))}
              <button
                onClick={() => setShowArchived(v => !v)}
                className="text-xs px-3 py-2 rounded-xl font-medium transition-all border"
                style={
                  showArchived
                    ? {
                        background: "#F3F4F6",
                        color: "#6B7280",
                        borderColor: "#D1D5DB",
                      }
                    : {
                        background: "#F9FAFB",
                        color: "#9CA3AF",
                        borderColor: "#E5E7EB",
                      }
                }
              >
                {isRtl ? "المؤرشفة" : "Archived"}
              </button>
              {/* Seed button deleted for production */}
              <Button
                onClick={() => navigate("/admin/products/new")}
                className="gap-2 text-white flex-shrink-0"
                style={{ background: "oklch(0.38 0.06 160)" }}
              >
                <Plus className="w-4 h-4" />
                {isRtl ? "إضافة منتج" : "Add Product"}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-40" />
            <p className="text-sm">
              {isRtl ? "جاري تحميل المنتجات..." : "Loading products..."}
            </p>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((p, i) => {
                const cat = CATEGORIES[p.category] ?? {
                  label: p.category,
                  color: "#6B7280",
                };
                const isLowStock = p.stock > 0 && p.stock < 10;
                const isOutOfStock = p.stock === 0;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow ${p.status === "archived" ? "opacity-60" : ""}`}
                    style={{
                      borderColor: isOutOfStock ? "#FCA5A5" : "#F3F4F6",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ background: `${cat.color}15` }}
                      >
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <Package
                            className="w-6 h-6"
                            style={{ color: cat.color }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: `${cat.color}15`,
                            color: cat.color,
                          }}
                        >
                          {cat.label}
                        </span>
                        {p.status === "archived" && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                            {isRtl ? "مؤرشف" : "Archived"}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-800 mb-0.5 leading-snug">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mb-3">
                      {p.sku}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-gray-50">
                        <div className="text-xs text-gray-400">
                          {isRtl ? "سعر التجزئة" : "Retail"}
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {(p.basePrice ?? 0).toLocaleString()} ر.س
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50">
                        <div className="text-xs text-gray-400">
                          {isRtl ? "سعر الموزع" : "Distributor"}
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {(p.distributorPrice ?? 0).toLocaleString()} ر.س
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        {isRtl ? "المخزون" : "Stock"}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={
                          isOutOfStock
                            ? { background: "#FEF2F2", color: "#EF4444" }
                            : isLowStock
                              ? { background: "#FFFBEB", color: "#F59E0B" }
                              : { background: "#ECFDF5", color: "#10B981" }
                        }
                      >
                        {isOutOfStock
                          ? isRtl
                            ? "نفد المخزون"
                            : "Out of Stock"
                          : `${p.stock} ${isRtl ? "قطعة" : "pcs"}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {(p.sizes ?? []).slice(0, 3).map(s => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        {isRtl ? "تعديل" : "Edit"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs px-3"
                        style={{
                          borderColor: "oklch(0.85 0.04 160)",
                          color: "oklch(0.38 0.06 160)",
                        }}
                        onClick={() => setCopyProduct(p)}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        style={
                          p.status === "active"
                            ? { borderColor: "#FCA5A5", color: "#EF4444" }
                            : { borderColor: "#A7F3D0", color: "#10B981" }
                        }
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: parseInt(p.id),
                            status:
                              p.status === "active" ? "archived" : "active",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        {p.status === "active" ? (
                          <Archive className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {p.status === "active"
                          ? isRtl
                            ? "أرشفة"
                            : "Archive"
                          : isRtl
                            ? "تفعيل"
                            : "Activate"}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {isRtl ? "لا توجد منتجات" : "No products found"}
                </p>
                {/* Seed button deleted for production */}
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <ProductFormModal
          product={editProduct}
          onClose={() => {
            setShowForm(false);
            setEditProduct(undefined);
          }}
          onSaved={() => {
            refetch();
          }}
        />
      )}
      {copyProduct && (
        <CopyProductModal
          product={copyProduct}
          onClose={() => setCopyProduct(undefined)}
          onSaved={() => {
            refetch();
          }}
        />
      )}
    </AdminLayout>
  );
}
