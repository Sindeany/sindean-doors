// ============================================================
// AdminEfficiency - تقارير الكفاءة التشغيلية
// معدل الإنتاج، وقت التسليم، معدل الأخطاء + تحديد الأهداف
// ============================================================
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, ReferenceLine
} from "recharts";
import {
  TrendingDown, Clock, AlertTriangle, CheckCircle2,
  Zap, BarChart2, Download, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Activity, Timer,
  Package, Truck, Wrench, ClipboardCheck, ShieldCheck,
  Target, Edit3, Save, X, Check, Info
} from "lucide-react";
import * as XLSX from "xlsx";

// ─── أنواع البيانات ───────────────────────────────────────
interface StageGoals {
  targetTime: number;       // ساعات
  targetThroughput: number; // طلبات/يوم
  targetErrorRate: number;  // نسبة مئوية
}

interface StageMetric {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  avgTime: number;
  throughput: number;
  errorRate: number;
  bottleneck: boolean;
  goals: StageGoals;
}

// ─── بيانات تجريبية ───────────────────────────────────────
const initialStages: StageMetric[] = [
  {
    id: "approval",
    name: "مرحلة الموافقة",
    icon: <ClipboardCheck className="w-5 h-5" />,
    color: "#6366f1",
    bgColor: "#eef2ff",
    avgTime: 2.4,
    throughput: 18,
    errorRate: 3.2,
    bottleneck: false,
    goals: { targetTime: 4, targetThroughput: 20, targetErrorRate: 2 },
  },
  {
    id: "production",
    name: "مرحلة الإنتاج",
    icon: <Wrench className="w-5 h-5" />,
    color: "#f59e0b",
    bgColor: "#fffbeb",
    avgTime: 38.5,
    throughput: 6,
    errorRate: 8.7,
    bottleneck: true,
    goals: { targetTime: 36, targetThroughput: 8, targetErrorRate: 5 },
  },
  {
    id: "qc",
    name: "مراقبة الجودة",
    icon: <ShieldCheck className="w-5 h-5" />,
    color: "#10b981",
    bgColor: "#ecfdf5",
    avgTime: 4.2,
    throughput: 14,
    errorRate: 2.1,
    bottleneck: false,
    goals: { targetTime: 6, targetThroughput: 15, targetErrorRate: 2 },
  },
  {
    id: "packaging",
    name: "التعبئة والتغليف",
    icon: <Package className="w-5 h-5" />,
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    avgTime: 3.1,
    throughput: 16,
    errorRate: 1.4,
    bottleneck: false,
    goals: { targetTime: 4, targetThroughput: 18, targetErrorRate: 1.5 },
  },
  {
    id: "shipping",
    name: "الشحن والتوصيل",
    icon: <Truck className="w-5 h-5" />,
    color: "#0ea5e9",
    bgColor: "#f0f9ff",
    avgTime: 28.6,
    throughput: 12,
    errorRate: 5.3,
    bottleneck: true,
    goals: { targetTime: 24, targetThroughput: 14, targetErrorRate: 3 },
  },
];

const weeklyTrend = [
  { day: "السبت",  موافقة: 3.1, إنتاج: 42, شحن: 31, تسليم: 26 },
  { day: "الأحد",  موافقة: 2.8, إنتاج: 39, شحن: 29, تسليم: 24 },
  { day: "الاثنين", موافقة: 2.2, إنتاج: 36, شحن: 27, تسليم: 22 },
  { day: "الثلاثاء", موافقة: 2.5, إنتاج: 40, شحن: 30, تسليم: 25 },
  { day: "الأربعاء", موافقة: 2.1, إنتاج: 35, شحن: 26, تسليم: 21 },
  { day: "الخميس", موافقة: 2.4, إنتاج: 38, شحن: 28, تسليم: 23 },
  { day: "الجمعة", موافقة: 1.9, إنتاج: 33, شحن: 25, تسليم: 20 },
];

const monthlyThroughput = [
  { month: "أكتوبر", طلبات: 142, مكتملة: 138, ملغية: 4 },
  { month: "نوفمبر", طلبات: 158, مكتملة: 151, ملغية: 7 },
  { month: "ديسمبر", طلبات: 134, مكتملة: 129, ملغية: 5 },
  { month: "يناير",  طلبات: 167, مكتملة: 160, ملغية: 7 },
  { month: "فبراير", طلبات: 175, مكتملة: 169, ملغية: 6 },
  { month: "مارس",   طلبات: 192, مكتملة: 185, ملغية: 7 },
  { month: "أبريل",  طلبات: 188, مكتملة: 181, ملغية: 7 },
];

const errorBreakdown = [
  { name: "خطأ في المقاس", value: 34, color: "#ef4444" },
  { name: "خطأ في اللون", value: 22, color: "#f97316" },
  { name: "تأخر الشحن", value: 18, color: "#eab308" },
  { name: "كسر أثناء النقل", value: 14, color: "#8b5cf6" },
  { name: "نقص في الكمية", value: 8, color: "#06b6d4" },
  { name: "أخرى", value: 4, color: "#6b7280" },
];

const deliveryTimeHistory = [
  { week: "أسبوع 1", متوسط: 72, هدف: 68 },
  { week: "أسبوع 2", متوسط: 69, هدف: 68 },
  { week: "أسبوع 3", متوسط: 74, هدف: 68 },
  { week: "أسبوع 4", متوسط: 67, هدف: 68 },
  { week: "أسبوع 5", متوسط: 65, هدف: 68 },
  { week: "أسبوع 6", متوسط: 63, هدف: 68 },
  { week: "أسبوع 7", متوسط: 61, هدف: 68 },
  { week: "أسبوع 8", متوسط: 59, هدف: 68 },
];

// ─── مكوّن KPI Card ───────────────────────────────────────
function KpiCard({ title, value, unit, change, changeLabel, icon, color, bgColor }: {
  title: string; value: string | number; unit?: string;
  change: number; changeLabel: string;
  icon: React.ReactNode; color: string; bgColor: string;
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800">{value}</span>
            {unit && <span className="text-sm text-gray-400">{unit}</span>}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgColor, color }}>
          {icon}
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${isNeutral ? "text-gray-400" : isPositive ? "text-emerald-600" : "text-red-500"}`}>
        {isNeutral ? <Minus className="w-3.5 h-3.5" /> : isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        <span>{Math.abs(change)}%</span>
        <span className="text-gray-400 font-normal">{changeLabel}</span>
      </div>
    </div>
  );
}

// ─── مكوّن GoalSettingModal ───────────────────────────────
function GoalSettingModal({
  stage,
  onSave,
  onClose,
}: {
  stage: StageMetric;
  onSave: (id: string, goals: StageGoals) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<StageGoals>({ ...stage.goals });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(stage.id, form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  }

  const fields: { key: keyof StageGoals; label: string; unit: string; min: number; max: number; step: number; hint: string }[] = [
    { key: "targetTime", label: "الهدف الزمني", unit: "ساعة", min: 0.5, max: 120, step: 0.5, hint: "الحد الأقصى المقبول لإتمام هذه المرحلة" },
    { key: "targetThroughput", label: "الإنتاجية المستهدفة", unit: "طلب/يوم", min: 1, max: 50, step: 1, hint: "عدد الطلبات المستهدف إنجازها يومياً" },
    { key: "targetErrorRate", label: "الحد الأقصى لمعدل الخطأ", unit: "%", min: 0.1, max: 20, step: 0.1, hint: "أعلى نسبة أخطاء مقبولة قبل التدخل" },
  ];

  // حساب تأثير التغيير
  const timeImprovement = ((stage.avgTime - form.targetTime) / stage.avgTime * 100).toFixed(1);
  const throughputGap = form.targetThroughput - stage.throughput;
  const errorGap = stage.errorRate - form.targetErrorRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* هيدر */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: stage.bgColor, color: stage.color }}>
              {stage.icon}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">تحديد أهداف {stage.name}</h2>
              <p className="text-xs text-gray-400">تعديل الأهداف يؤثر على مؤشرات الأداء فوراً</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* الحقول */}
        <div className="px-6 py-5 space-y-5">
          {fields.map(f => {
            const currentVal = stage[f.key === "targetTime" ? "avgTime" : f.key === "targetThroughput" ? "throughput" : "errorRate"] as number;
            const diff = form[f.key] - currentVal;
            const isGood = f.key === "targetTime" ? diff < 0 : f.key === "targetThroughput" ? diff > 0 : diff < 0;
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">الفعلي: <strong className="text-gray-600">{currentVal} {f.unit}</strong></span>
                    {diff !== 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isGood ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)} {f.unit}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={form[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) }))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: stage.color }}
                  />
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 w-28">
                    <input
                      type="number"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={form[f.key]}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= f.min && v <= f.max) setForm(prev => ({ ...prev, [f.key]: v }));
                      }}
                      className="w-12 text-sm font-bold text-gray-800 bg-transparent outline-none text-center"
                    />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{f.unit}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {f.hint}
                </p>
              </div>
            );
          })}

          {/* ملخص التأثير */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" style={{ color: stage.color }} />
              ملخص تأثير الأهداف الجديدة
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className={`text-base font-bold ${parseFloat(timeImprovement) > 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {parseFloat(timeImprovement) > 0 ? "+" : ""}{timeImprovement}%
                </p>
                <p className="text-[10px] text-gray-400">تغيير الوقت</p>
              </div>
              <div className="text-center">
                <p className={`text-base font-bold ${throughputGap > 0 ? "text-emerald-600" : throughputGap < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {throughputGap > 0 ? "+" : ""}{throughputGap} طلب
                </p>
                <p className="text-[10px] text-gray-400">فجوة الإنتاجية</p>
              </div>
              <div className="text-center">
                <p className={`text-base font-bold ${errorGap > 0 ? "text-emerald-600" : errorGap < 0 ? "text-red-500" : "text-gray-400"}`}>
                  {errorGap > 0 ? "-" : "+"}{Math.abs(errorGap).toFixed(1)}%
                </p>
                <p className="text-[10px] text-gray-400">تحسن معدل الخطأ</p>
              </div>
            </div>
          </div>
        </div>

        {/* أزرار */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: saved ? "#10b981" : stage.color }}
          >
            {saved ? <><Check className="w-4 h-4" />تم الحفظ!</> : <><Save className="w-4 h-4" />حفظ الأهداف</>}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── مكوّن StageCard مع أهداف ─────────────────────────────
function StageCard({
  stage,
  onEditGoals,
}: {
  stage: StageMetric;
  onEditGoals: (stage: StageMetric) => void;
}) {
  const timeEfficiency = Math.round((stage.goals.targetTime / stage.avgTime) * 100);
  const throughputEfficiency = Math.round((stage.throughput / stage.goals.targetThroughput) * 100);
  const errorEfficiency = Math.round((stage.goals.targetErrorRate / stage.errorRate) * 100);
  const overallScore = Math.round((Math.min(timeEfficiency, 100) + Math.min(throughputEfficiency, 100) + Math.min(errorEfficiency, 100)) / 3);

  const timeOk = stage.avgTime <= stage.goals.targetTime;
  const throughputOk = stage.throughput >= stage.goals.targetThroughput;
  const errorOk = stage.errorRate <= stage.goals.targetErrorRate;

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${stage.bottleneck ? "border-amber-200 ring-1 ring-amber-100" : "border-gray-100"}`}>
      {/* هيدر البطاقة */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stage.bgColor, color: stage.color }}>
            {stage.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{stage.name}</h3>
            {stage.bottleneck && (
              <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" />نقطة اختناق
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* درجة الأداء الكلية */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: overallScore >= 80 ? "#10b981" : overallScore >= 60 ? "#f59e0b" : "#ef4444" }}
            title="درجة الأداء الكلية"
          >
            {overallScore}
          </div>
          <button
            onClick={() => onEditGoals(stage)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            title="تعديل الأهداف"
          >
            <Edit3 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* مقاييس الأداء مقابل الأهداف */}
      <div className="space-y-3">
        {/* الوقت */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">الوقت الفعلي</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-700 font-semibold">{stage.avgTime}س</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-400">هدف {stage.goals.targetTime}س</span>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center ${timeOk ? "bg-emerald-100" : "bg-red-100"}`}>
                {timeOk ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <X className="w-2.5 h-2.5 text-red-500" />}
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(timeEfficiency, 100)}%`,
                backgroundColor: timeOk ? "#10b981" : "#ef4444"
              }}
            />
          </div>
        </div>

        {/* الإنتاجية */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">الإنتاجية</span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-700 font-semibold">{stage.throughput} طلب/يوم</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-400">هدف {stage.goals.targetThroughput}</span>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center ${throughputOk ? "bg-emerald-100" : "bg-amber-100"}`}>
                {throughputOk ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Minus className="w-2.5 h-2.5 text-amber-500" />}
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(throughputEfficiency, 100)}%`,
                backgroundColor: throughputOk ? "#10b981" : "#f59e0b"
              }}
            />
          </div>
        </div>

        {/* معدل الخطأ */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">معدل الخطأ</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold ${stage.errorRate > stage.goals.targetErrorRate ? "text-red-500" : "text-emerald-600"}`}>
                {stage.errorRate}%
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-400">حد {stage.goals.targetErrorRate}%</span>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center ${errorOk ? "bg-emerald-100" : "bg-red-100"}`}>
                {errorOk ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <X className="w-2.5 h-2.5 text-red-500" />}
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(errorEfficiency, 100)}%`,
                backgroundColor: errorOk ? "#10b981" : "#ef4444"
              }}
            />
          </div>
        </div>
      </div>

      {/* ملخص الحالة */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[timeOk, throughputOk, errorOk].map((ok, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`}
              title={["الوقت", "الإنتاجية", "معدل الخطأ"][i]}
            />
          ))}
        </div>
        <button
          onClick={() => onEditGoals(stage)}
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: stage.color }}
        >
          <Target className="w-3 h-3" />
          تعديل الأهداف
        </button>
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function AdminEfficiency() {
  const [stages, setStages] = useState<StageMetric[]>(initialStages);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const [activeTab, setActiveTab] = useState<"overview" | "stages" | "errors" | "delivery" | "goals">("overview");
  const [editingStage, setEditingStage] = useState<StageMetric | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);

  function handleSaveGoals(id: string, goals: StageGoals) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, goals } : s));
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }

  const totalAvgDelivery = stages.reduce((acc, s) => acc + s.avgTime, 0);
  const totalTargetDelivery = stages.reduce((acc, s) => acc + s.goals.targetTime, 0);
  const overallErrorRate = (stages.reduce((acc, s) => acc + s.errorRate, 0) / stages.length).toFixed(1);
  const bottlenecks = stages.filter(s => s.bottleneck).length;
  const stagesOnTarget = stages.filter(s =>
    s.avgTime <= s.goals.targetTime &&
    s.throughput >= s.goals.targetThroughput &&
    s.errorRate <= s.goals.targetErrorRate
  ).length;

  function exportToExcel() {
    const data = stages.map(s => ({
      "المرحلة": s.name,
      "متوسط الوقت (ساعة)": s.avgTime,
      "هدف الوقت (ساعة)": s.goals.targetTime,
      "الإنتاجية الفعلية (طلب/يوم)": s.throughput,
      "هدف الإنتاجية": s.goals.targetThroughput,
      "معدل الأخطاء الفعلي %": s.errorRate,
      "حد معدل الأخطاء %": s.goals.targetErrorRate,
      "نقطة اختناق": s.bottleneck ? "نعم" : "لا",
      "الكفاءة الزمنية %": Math.round((s.goals.targetTime / s.avgTime) * 100),
      "ضمن الهدف": (s.avgTime <= s.goals.targetTime && s.throughput >= s.goals.targetThroughput && s.errorRate <= s.goals.targetErrorRate) ? "نعم" : "لا",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الكفاءة والأهداف");
    XLSX.writeFile(wb, `تقرير-الكفاءة-${new Date().toLocaleDateString("ar-SA").replace(/\//g, "-")}.xlsx`);
  }

  // بيانات مقارنة الفعلي بالهدف للرسم البياني
  const goalsComparisonData = stages.map(s => ({
    name: s.name.replace("مرحلة ", ""),
    "الفعلي (ساعة)": s.avgTime,
    "الهدف (ساعة)": s.goals.targetTime,
    color: s.color,
  }));

  const radarData = stages.map(s => ({
    stage: s.name.replace("مرحلة ", ""),
    الكفاءة: Math.min(Math.round((s.goals.targetTime / s.avgTime) * 100), 100),
    الجودة: Math.min(Math.round((s.goals.targetErrorRate / s.errorRate) * 100), 100),
    السرعة: Math.min(Math.round((s.throughput / s.goals.targetThroughput) * 100), 100),
  }));

  return (
    <AdminLayout title="تقارير الكفاءة التشغيلية">
      {/* ─── فلاش حفظ الأهداف ─── */}
      {saveFlash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg">
          <Check className="w-4 h-4" />
          تم حفظ الأهداف بنجاح
        </div>
      )}

      {/* ─── الهيدر ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">تقارير الكفاءة التشغيلية</h1>
          <p className="text-sm text-gray-400 mt-0.5">قياس الأداء الفعلي مقارنةً بالأهداف المحددة لكل مرحلة</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-xl p-1 text-xs font-medium">
            {(["week", "month", "quarter"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all ${period === p ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {p === "week" ? "أسبوع" : p === "month" ? "شهر" : "ربع سنة"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setActiveTab("goals")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90"
            style={{ backgroundColor: "#6366f1" }}
          >
            <Target className="w-3.5 h-3.5" />
            إدارة الأهداف
          </button>
          <button onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-3.5 h-3.5" />
            تصدير Excel
          </button>
          <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="متوسط وقت التسليم الكلي" value={Math.round(totalAvgDelivery / 24)} unit="يوم"
          change={-8} changeLabel="مقارنة بالشهر الماضي"
          icon={<Clock className="w-5 h-5" />} color="#6366f1" bgColor="#eef2ff" />
        <KpiCard title="المراحل ضمن الأهداف" value={`${stagesOnTarget}/${stages.length}`}
          change={stagesOnTarget > 2 ? 5 : -5} changeLabel="مقارنة بالشهر الماضي"
          icon={<CheckCircle2 className="w-5 h-5" />} color="#10b981" bgColor="#ecfdf5" />
        <KpiCard title="معدل الأخطاء الإجمالي" value={overallErrorRate} unit="%"
          change={-12} changeLabel="تحسن عن الشهر الماضي"
          icon={<AlertTriangle className="w-5 h-5" />} color="#f59e0b" bgColor="#fffbeb" />
        <KpiCard title="نقاط الاختناق النشطة" value={bottlenecks} unit="مرحلة"
          change={0} changeLabel="لا تغيير"
          icon={<Activity className="w-5 h-5" />} color="#ef4444" bgColor="#fef2f2" />
      </div>

      {/* ─── تبويبات ─── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {[
          { id: "overview", label: "نظرة عامة", icon: <BarChart2 className="w-3.5 h-3.5" /> },
          { id: "stages", label: "المراحل", icon: <Zap className="w-3.5 h-3.5" /> },
          { id: "goals", label: "الأهداف", icon: <Target className="w-3.5 h-3.5" /> },
          { id: "errors", label: "الأخطاء", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { id: "delivery", label: "وقت التسليم", icon: <Timer className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.icon}
            {tab.label}
            {tab.id === "goals" && (
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                {stages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── تبويب: نظرة عامة ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">الإنتاجية الشهرية</h2>
                <p className="text-xs text-gray-400">الطلبات المكتملة مقابل الملغية</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />مكتملة</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" />ملغية</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyThroughput} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="مكتملة" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="ملغية" fill="#fca5a5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-5">مؤشر الأداء الشامل لكل مرحلة</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="stage" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Radar name="الكفاءة" dataKey="الكفاءة" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="الجودة" dataKey="الجودة" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="السرعة" dataKey="السرعة" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex gap-6 justify-center text-xs text-gray-500 mt-2">
              {[{ label: "الكفاءة الزمنية", color: "#6366f1" }, { label: "جودة الإنتاج", color: "#10b981" }, { label: "سرعة الإنتاجية", color: "#f59e0b" }].map(l => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: l.color, opacity: 0.7 }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── تبويب: المراحل ─── */}
      {activeTab === "stages" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">خط سير الطلب - الفعلي مقابل الهدف</h2>
            <div className="flex items-end gap-0 mb-3 overflow-x-auto pb-2">
              {stages.map((stage, i) => {
                const width = Math.round((stage.avgTime / totalAvgDelivery) * 100);
                const isOver = stage.avgTime > stage.goals.targetTime;
                return (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="relative h-12 rounded-lg flex items-center justify-center text-white text-xs font-medium px-2 cursor-pointer transition-all hover:opacity-90"
                        style={{ width: `${Math.max(width * 2.5, 80)}px`, backgroundColor: stage.color }}
                        onClick={() => onEditGoals(stage)}
                        title={`${stage.name}: ${stage.avgTime}س / هدف ${stage.goals.targetTime}س`}
                      >
                        <span className="truncate text-center leading-tight">
                          {stage.name.replace("مرحلة ", "")}<br />
                          <span className="opacity-80 text-[10px]">{stage.avgTime}س</span>
                        </span>
                        {isOver && (
                          <span className="absolute -top-2 -right-1 w-4 h-4 bg-red-400 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">هدف: {stage.goals.targetTime}س</span>
                    </div>
                    {i < stages.length - 1 && <div className="w-4 h-0.5 bg-gray-200 flex-shrink-0 mb-4" />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>إجمالي الفعلي: <strong className="text-gray-700">{Math.round(totalAvgDelivery / 24)} يوم</strong></span>
              <span>الهدف الكلي: <strong className="text-emerald-600">{Math.round(totalTargetDelivery / 24)} يوم</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stages.map(stage => (
              <StageCard key={stage.id} stage={stage} onEditGoals={setEditingStage} />
            ))}
          </div>
        </div>
      )}

      {/* ─── تبويب: الأهداف ─── */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          {/* ملخص الأهداف */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">الأداء الفعلي مقابل الأهداف — وقت المرحلة</h2>
                <p className="text-xs text-gray-400">الأعمدة الداكنة = الفعلي، الفاتحة = الهدف</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={goalsComparisonData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="س" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v: number, name: string) => [`${v} ساعة`, name]}
                />
                <Bar dataKey="الفعلي (ساعة)" radius={[6, 6, 0, 0]}>
                  {stages.map(s => (
                    <Cell key={s.id} fill={s.avgTime > s.goals.targetTime ? "#ef4444" : "#10b981"} />
                  ))}
                </Bar>
                <Bar dataKey="الهدف (ساعة)" fill="#e5e7eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* جدول الأهداف التفصيلي */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">جدول الأهداف التفصيلي</h2>
              <span className="text-xs text-gray-400">{stagesOnTarget} من {stages.length} مراحل ضمن الأهداف</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["المرحلة", "الوقت الفعلي", "هدف الوقت", "الإنتاجية", "هدف الإنتاجية", "معدل الخطأ", "حد الخطأ", "الحالة", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stages.map(s => {
                    const timeOk = s.avgTime <= s.goals.targetTime;
                    const tpOk = s.throughput >= s.goals.targetThroughput;
                    const errOk = s.errorRate <= s.goals.targetErrorRate;
                    const allOk = timeOk && tpOk && errOk;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bgColor, color: s.color }}>
                              {s.icon}
                            </div>
                            <span className="font-medium text-gray-700 text-xs">{s.name.replace("مرحلة ", "")}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-xs ${timeOk ? "text-emerald-600" : "text-red-500"}`}>{s.avgTime}س</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.goals.targetTime}س</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-xs ${tpOk ? "text-emerald-600" : "text-amber-500"}`}>{s.throughput}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.goals.targetThroughput}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-xs ${errOk ? "text-emerald-600" : "text-red-500"}`}>{s.errorRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{s.goals.targetErrorRate}%</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allOk ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                            {allOk ? "✓ ضمن الهدف" : "تجاوز الهدف"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditingStage(s)}
                            className="flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── تبويب: الأخطاء ─── */}
      {activeTab === "errors" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-5">توزيع أنواع الأخطاء</h2>
              <div className="space-y-3">
                {errorBreakdown.map(err => (
                  <div key={err.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">{err.name}</span>
                      <span className="font-bold" style={{ color: err.color }}>{err.value}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${err.value}%`, backgroundColor: err.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-5">معدل الخطأ الفعلي مقابل الحد المسموح</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stages.map(s => ({ name: s.name.replace("مرحلة ", ""), "الفعلي": s.errorRate, "الحد المسموح": s.goals.targetErrorRate }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} unit="%" domain={[0, 12]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v: number, name: string) => [`${v}%`, name]} />
                  <Bar dataKey="الفعلي" radius={[0, 6, 6, 0]}>
                    {stages.map(s => (
                      <Cell key={s.id} fill={s.errorRate > s.goals.targetErrorRate ? "#ef4444" : "#10b981"} />
                    ))}
                  </Bar>
                  <Bar dataKey="الحد المسموح" fill="#e5e7eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ─── تبويب: وقت التسليم ─── */}
      {activeTab === "delivery" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">تطور متوسط وقت التسليم</h2>
                <p className="text-xs text-gray-400">بالساعات — الخط المنقط يمثل الهدف (68 ساعة)</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <TrendingDown className="w-3.5 h-3.5" />
                تحسن 18% خلال 8 أسابيع
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={deliveryTimeHistory}>
                <defs>
                  <linearGradient id="deliveryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[50, 80]} unit="س" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v: number, name: string) => [`${v} ساعة`, name]} />
                <Area type="monotone" dataKey="متوسط" stroke="#6366f1" strokeWidth={2.5} fill="url(#deliveryGrad)" dot={{ r: 4, fill: "#6366f1" }} />
                <Line type="monotone" dataKey="هدف" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">مقارنة الوقت الفعلي بالهدف</h2>
              <div className="space-y-4">
                {stages.map(stage => {
                  const diff = stage.avgTime - stage.goals.targetTime;
                  const isOver = diff > 0;
                  return (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stage.bgColor, color: stage.color }}>
                        {stage.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 font-medium truncate">{stage.name.replace("مرحلة ", "")}</span>
                          <span className={`font-bold flex-shrink-0 mr-2 ${isOver ? "text-red-500" : "text-emerald-600"}`}>
                            {isOver ? `+${diff.toFixed(1)}س` : `${diff.toFixed(1)}س`}
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-100 rounded-full">
                          <div
                            className="absolute top-0 right-0 h-full rounded-full"
                            style={{ width: `${Math.min((stage.goals.targetTime / stage.avgTime) * 100, 100)}%`, backgroundColor: isOver ? "#ef4444" : "#10b981" }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                          <span>فعلي: {stage.avgTime}س</span>
                          <span>هدف: {stage.goals.targetTime}س</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">توصيات تحسين الكفاءة</h2>
              <div className="space-y-3">
                {[
                  { priority: "عاجل", color: "red", title: "تسريع مرحلة الإنتاج", desc: "تجاوز الهدف بـ 2.5 ساعة — مراجعة جدول الماكينات", icon: <Wrench className="w-4 h-4" /> },
                  { priority: "مهم", color: "amber", title: "تحسين شركاء الشحن", desc: "معدل تأخر 5.3% — مراجعة عقود شركات الشحن", icon: <Truck className="w-4 h-4" /> },
                  { priority: "مقترح", color: "blue", title: "أتمتة مراقبة الجودة", desc: "تقليل وقت الفحص بإضافة قوائم مراجعة رقمية", icon: <ShieldCheck className="w-4 h-4" /> },
                ].map((rec, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-xl border ${rec.color === "red" ? "bg-red-50 border-red-100" : rec.color === "amber" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rec.color === "red" ? "bg-red-100 text-red-600" : rec.color === "amber" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                      {rec.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rec.color === "red" ? "bg-red-100 text-red-600" : rec.color === "amber" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>{rec.priority}</span>
                        <span className="text-xs font-semibold text-gray-700">{rec.title}</span>
                      </div>
                      <p className="text-xs text-gray-500">{rec.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة تعديل الأهداف ─── */}
      {editingStage && (
        <GoalSettingModal
          stage={editingStage}
          onSave={handleSaveGoals}
          onClose={() => setEditingStage(null)}
        />
      )}
    </AdminLayout>
  );

  // دالة مساعدة للاستخدام داخل JSX
  function onEditGoals(stage: StageMetric) {
    setEditingStage(stage);
  }
}
