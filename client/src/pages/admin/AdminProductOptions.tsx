/**
 * AdminProductOptions — لوحة تحكم إدارة خيارات طلب الباب
 * تتيح: تفعيل/تعطيل الأقسام والمجموعات والقيم، تحديد الإلزامية، تعديل الأسعار، إضافة خيارات جديدة
 */
import { useState } from "react";
import {
  Settings, ToggleLeft, ToggleRight, DollarSign, Plus, Trash2,
  ChevronDown, ChevronUp, Eye, EyeOff, Lock, Unlock,
  GripVertical, Edit2, Check, X, AlertTriangle, Package,
  Layers, Tag, Save, RotateCcw, Cloud,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  useProductOptions,
  type Section,
  type OptionGroup,
  type OptionValue,
} from "@/stores/productOptionsStore";

// ─── Color helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  enabled:  "bg-green-100 text-green-700 border-green-200",
  disabled: "bg-gray-100 text-gray-500 border-gray-200",
  required: "bg-red-100 text-red-700 border-red-200",
  optional: "bg-blue-100 text-blue-700 border-blue-200",
};

// ─── Inline Edit Input ────────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  className = "",
}: {
  value: string | number;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        className={`text-right hover:bg-gray-50 rounded px-1 py-0.5 transition-colors group ${className}`}
      >
        {value}
        <Edit2 className="w-3 h-3 text-gray-300 group-hover:text-gray-500 inline mr-1" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="border border-oak rounded px-2 py-0.5 text-sm focus:outline-none w-40"
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="text-green-600 hover:text-green-700">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Price Input ──────────────────────────────────────────────────────────────

function PriceInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? 0));

  const display = value !== undefined && value !== 0
    ? `${value > 0 ? "+" : ""}${value} ر.س`
    : "—";

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(String(value ?? 0)); setEditing(true); }}
        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
          value && value !== 0
            ? "bg-copper/10 text-copper border-copper/20 font-bold"
            : "bg-gray-50 text-gray-400 border-gray-200 hover:border-copper/30"
        }`}
      >
        <DollarSign className="w-3 h-3 inline ml-0.5" />
        {display}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onChange(Number(draft)); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="border border-copper rounded px-2 py-0.5 text-sm focus:outline-none w-20"
        placeholder="0"
      />
      <button onClick={() => { onChange(Number(draft)); setEditing(false); }} className="text-green-600">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="text-gray-400">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Value Row ────────────────────────────────────────────────────────────────

function ValueRow({
  value,
  groupId,
  sectionId,
  onToggle,
  onPriceChange,
  onLabelChange,
  onDelete,
}: {
  value: OptionValue;
  groupId: string;
  sectionId: string;
  onToggle: () => void;
  onPriceChange: (v: number) => void;
  onLabelChange: (v: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
      value.enabled ? "bg-white border-gray-100" : "bg-gray-50 border-gray-100 opacity-60"
    }`}>
      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
      {/* Color swatch if applicable */}
      {value.hex && (
        <div className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
          style={{ backgroundColor: value.hex }} />
      )}
      {/* Label */}
      <div className="flex-1 min-w-0">
        <InlineEdit value={value.label} onSave={onLabelChange} className="text-sm font-medium text-gray-700" />
        {value.description && (
          <p className="text-xs text-gray-400 truncate">{value.description}</p>
        )}
      </div>
      {/* Price */}
      <PriceInput value={value.priceAdj} onChange={onPriceChange} />
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`p-1.5 rounded-lg transition-colors ${
          value.enabled ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"
        }`}
        title={value.enabled ? "تعطيل" : "تفعيل"}
      >
        {value.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
        title="حذف"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  group,
  sectionId,
  onUpdate,
}: {
  group: OptionGroup;
  sectionId: string;
  onUpdate: (updates: Partial<OptionGroup>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newValueLabel, setNewValueLabel] = useState("");
  const { store } = useProductOptions();
  const { updateValue, addValue, deleteValue } = store;

  const handleAddValue = () => {
    if (!newValueLabel.trim()) return;
    addValue(sectionId, group.id, {
      id: `val_${Date.now()}`,
      label: newValueLabel.trim(),
      enabled: true,
    });
    setNewValueLabel("");
    toast.success("تم إضافة الخيار");
  };

  return (
    <div className={`border-2 rounded-xl transition-all ${
      group.enabled ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50"
    }`}>
      {/* Group Header */}
      <div className="flex items-center gap-3 p-3">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <InlineEdit
              value={group.label}
              onSave={(v) => onUpdate({ label: v })}
              className="font-semibold text-sm text-gray-800"
            />
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              group.enabled ? STATUS_COLORS.enabled : STATUS_COLORS.disabled
            }`}>
              {group.enabled ? "مفعّل" : "معطّل"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              group.required ? STATUS_COLORS.required : STATUS_COLORS.optional
            }`}>
              {group.required ? "إلزامي" : "اختياري"}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {group.type}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Price (for toggle type) */}
          {group.type === "toggle" && (
            <PriceInput value={group.priceAdj} onChange={(v) => onUpdate({ priceAdj: v })} />
          )}
          {/* Required toggle */}
          <button
            onClick={() => onUpdate({ required: !group.required })}
            className={`p-1.5 rounded-lg transition-colors ${
              group.required ? "text-red-500 hover:bg-red-50" : "text-gray-400 hover:bg-gray-100"
            }`}
            title={group.required ? "جعله اختيارياً" : "جعله إلزامياً"}
          >
            {group.required ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          {/* Enable toggle */}
          <button
            onClick={() => onUpdate({ enabled: !group.enabled })}
            className={`p-1.5 rounded-lg transition-colors ${
              group.enabled ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"
            }`}
            title={group.enabled ? "تعطيل" : "تفعيل"}
          >
            {group.enabled
              ? <ToggleRight className="w-5 h-5" />
              : <ToggleLeft className="w-5 h-5" />}
          </button>
          {/* Expand */}
          {group.values.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Values list */}
      {expanded && group.values.length > 0 && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
            <Tag className="w-3 h-3" /> الخيارات المتاحة ({group.values.length})
          </p>
          {group.values.map((val) => (
            <ValueRow
              key={val.id}
              value={val}
              groupId={group.id}
              sectionId={sectionId}
              onToggle={() => updateValue(sectionId, group.id, val.id, { enabled: !val.enabled })}
              onPriceChange={(v) => updateValue(sectionId, group.id, val.id, { priceAdj: v })}
              onLabelChange={(v) => updateValue(sectionId, group.id, val.id, { label: v })}
              onDelete={() => {
                deleteValue(sectionId, group.id, val.id);
                toast.success("تم حذف الخيار");
              }}
            />
          ))}
          {/* Add new value */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-gray-200">
            <input
              value={newValueLabel}
              onChange={(e) => setNewValueLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddValue()}
              placeholder="اسم الخيار الجديد..."
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak"
            />
            <button
              onClick={handleAddValue}
              className="px-3 py-1.5 bg-oak text-white rounded-lg text-sm font-medium hover:bg-oak/90 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> إضافة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(true);
  const { store: store2 } = useProductOptions();
  const { updateSection, updateGroup, addGroup } = store2;
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newGroupType, setNewGroupType] = useState<OptionGroup["type"]>("chips");

  const handleAddGroup = () => {
    if (!newGroupLabel.trim()) return;
    addGroup(section.id, {
      id: `grp_${Date.now()}`,
      label: newGroupLabel.trim(),
      type: newGroupType,
      enabled: true,
      required: false,
      values: [],
      sectionId: section.id,
      order: section.groups.length,
    });
    setNewGroupLabel("");
    toast.success("تم إضافة المجموعة");
  };

  const enabledCount = section.groups.filter((g) => g.enabled).length;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
      section.enabled ? "border-oak/20 shadow-sm" : "border-dashed border-gray-200 opacity-70"
    }`}>
      {/* Section Header */}
      <div className={`flex items-center gap-3 px-4 py-3 ${
        section.enabled ? "bg-oak/5" : "bg-gray-50"
      }`}>
        <span className="text-xl">{section.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <InlineEdit
              value={section.label}
              onSave={(v) => updateSection(section.id, { label: v })}
              className="font-bold text-gray-800"
            />
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              section.enabled ? STATUS_COLORS.enabled : STATUS_COLORS.disabled
            }`}>
              {section.enabled ? "مفعّل" : "معطّل"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabledCount}/{section.groups.length} مجموعة مفعّلة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateSection(section.id, { enabled: !section.enabled })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              section.enabled
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {section.enabled
              ? <><ToggleRight className="w-4 h-4" /> مفعّل</>
              : <><ToggleLeft className="w-4 h-4" /> معطّل</>}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-white/50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Groups */}
      {expanded && (
        <div className="p-4 space-y-3 bg-white">
          {section.groups.map((grp) => (
            <GroupCard
              key={grp.id}
              group={grp}
              sectionId={section.id}
              onUpdate={(updates) => updateGroup(section.id, grp.id, updates)}
            />
          ))}

          {/* Add new group */}
          <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-200">
            <input
              value={newGroupLabel}
              onChange={(e) => setNewGroupLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
              placeholder="اسم المجموعة الجديدة..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak"
            />
            <select
              value={newGroupType}
              onChange={(e) => setNewGroupType(e.target.value as OptionGroup["type"])}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-oak bg-white"
            >
              <option value="chips">chips</option>
              <option value="radio_cards">radio_cards</option>
              <option value="checkbox_cards">checkbox_cards</option>
              <option value="color_swatches">color_swatches</option>
              <option value="toggle">toggle</option>
              <option value="number_input">number_input</option>
              <option value="text_input">text_input</option>
              <option value="file_upload">file_upload</option>
            </select>
            <button
              onClick={handleAddGroup}
              className="px-3 py-2 bg-oak text-white rounded-lg text-sm font-medium hover:bg-oak/90 transition-colors flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> إضافة مجموعة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProductOptions() {
  const { sections, store: store3 } = useProductOptions();
  const { addSection, resetToDefaults } = store3;
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const saveOptionsMutation = trpc.productOptions.save.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ الخيارات ومزامنتها", {
        description: "ستنعكس التغييرات على نموذج الموزع فوراً",
      });
      setIsSyncing(false);
    },
    onError: () => {
      toast.error("تعذّر المزامنة مع الخادم", {
        description: "تم الحفظ محلياً فقط. حاول مرة أخرى.",
      });
      setIsSyncing(false);
    },
  });

  const handleSave = () => {
    setIsSyncing(true);
    saveOptionsMutation.mutate({
      sectionsJson: JSON.stringify(sections),
      updatedBy: "admin",
    });
  };

  const enabledSectionsCount = sections.filter((s) => s.enabled).length;
  const totalGroups = sections.reduce((sum, s) => sum + s.groups.length, 0);
  const enabledGroups = sections.reduce((sum, s) => sum + s.groups.filter((g) => g.enabled).length, 0);
  const requiredGroups = sections.reduce((sum, s) => sum + s.groups.filter((g) => g.required && g.enabled).length, 0);

  const handleAddSection = () => {
    if (!newSectionLabel.trim()) return;
    addSection({
      id: `sec_${Date.now()}`,
      label: newSectionLabel.trim(),
      icon: "📦",
      order: sections.length + 1,
      enabled: true,
      groups: [],
    });
    setNewSectionLabel("");
    setShowAddSection(false);
    toast.success("تم إضافة القسم الجديد");
  };

  const handleReset = () => {
    if (confirm("هل تريد إعادة ضبط جميع الخيارات للإعدادات الافتراضية؟ سيتم فقدان جميع التعديلات.")) {
      resetToDefaults();
      toast.success("تم إعادة الضبط للإعدادات الافتراضية");
    }
  };

  return (
    <AdminLayout title="إدارة خيارات الطلب">
      <div className="max-w-4xl mx-auto space-y-6" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Settings className="w-6 h-6 text-oak" />
              إدارة خيارات الطلب
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              تحكم في خيارات نموذج طلب الباب — تفعيل/تعطيل، إلزامية، تسعير
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة الضبط
            </button>
            <button
              onClick={handleSave}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 bg-oak text-white rounded-xl text-sm font-semibold hover:bg-oak/90 transition-colors disabled:opacity-60"
            >
              {isSyncing ? <Cloud className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
              {isSyncing ? "جارٍ المزامنة..." : "حفظ ومزامنة"}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "الأقسام المفعّلة", value: `${enabledSectionsCount}/${sections.length}`, icon: <Layers className="w-5 h-5" />, color: "text-oak" },
            { label: "المجموعات المفعّلة", value: `${enabledGroups}/${totalGroups}`, icon: <Package className="w-5 h-5" />, color: "text-blue-600" },
            { label: "الحقول الإلزامية", value: requiredGroups, icon: <Lock className="w-5 h-5" />, color: "text-red-500" },
            { label: "الحقول الاختيارية", value: enabledGroups - requiredGroups, icon: <Unlock className="w-5 h-5" />, color: "text-green-600" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`${kpi.color} opacity-80`}>{kpi.icon}</div>
              <div>
                <p className="text-xl font-black text-gray-800">{kpi.value}</p>
                <p className="text-xs text-gray-500">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">ملاحظة مهمة</p>
            <p className="text-xs text-amber-700 mt-0.5">
              التغييرات تنعكس فوراً على نموذج الطلب للعملاء. تأكد من مراجعة التعديلات قبل الحفظ.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
        </div>

        {/* Add new section */}
        {showAddSection ? (
          <div className="bg-white border-2 border-dashed border-oak/30 rounded-2xl p-4">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-oak" /> قسم جديد
            </h3>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newSectionLabel}
                onChange={(e) => setNewSectionLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
                placeholder="اسم القسم الجديد..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-oak"
              />
              <button
                onClick={handleAddSection}
                className="px-4 py-2 bg-oak text-white rounded-xl text-sm font-semibold hover:bg-oak/90 transition-colors"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddSection(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-oak/40 hover:text-oak transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            إضافة قسم رئيسي جديد
          </button>
        )}
      </div>
    </AdminLayout>
  );
}
