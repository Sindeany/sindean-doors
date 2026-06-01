import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, FileText, Clock, Send, Users, BarChart3, Award, X,
  ChevronRight, AlertCircle, CheckCircle, Loader2, Trash2
} from "lucide-react";
import AdminRFQDetail from "./AdminRFQDetail";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-stone-100 text-stone-600" },
  published: { label: "منشور", color: "bg-blue-100 text-blue-700" },
  closed: { label: "مغلق", color: "bg-amber-100 text-amber-700" },
  evaluated: { label: "تم التقييم", color: "bg-purple-100 text-purple-700" },
  awarded: { label: "تمت الترسية ✓", color: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
};

interface RfqItem {
  name: string;
  description: string;
  qty: number;
  unit: string;
  specs: string;
}

export default function AdminRFQ() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  // Create form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    deliveryLocation: "",
    deliveryDays: "",
    paymentTerms: "",
    warrantyMonths: "",
    submissionDeadline: "",
  });
  const [items, setItems] = useState<RfqItem[]>([
    { name: "", description: "", qty: 1, unit: "قطعة", specs: "" }
  ]);
  const [createError, setCreateError] = useState("");

  const { data: rfqs, refetch } = trpc.rfq.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus as any } : undefined
  );

  const createMutation = trpc.rfq.create.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      resetForm();
      refetch();
    },
    onError: (err) => setCreateError(err.message),
  });

  const resetForm = () => {
    setForm({ title: "", description: "", deliveryLocation: "", deliveryDays: "", paymentTerms: "", warrantyMonths: "", submissionDeadline: "" });
    setItems([{ name: "", description: "", qty: 1, unit: "قطعة", specs: "" }]);
    setCreateError("");
  };

  const addItem = () => setItems(prev => [...prev, { name: "", description: "", qty: 1, unit: "قطعة", specs: "" }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof RfqItem, value: string | number) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (items.some(item => !item.name.trim())) {
      setCreateError("يرجى إدخال اسم لجميع البنود");
      return;
    }
    createMutation.mutate({
      title: form.title,
      description: form.description || undefined,
      items: items.map(item => ({
        name: item.name,
        description: item.description || undefined,
        qty: item.qty,
        unit: item.unit,
        specs: item.specs || undefined,
      })),
      deliveryLocation: form.deliveryLocation || undefined,
      deliveryDays: form.deliveryDays ? Number(form.deliveryDays) : undefined,
      paymentTerms: form.paymentTerms || undefined,
      warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : undefined,
      submissionDeadline: new Date(form.submissionDeadline).getTime(),
    });
  };

  if (selectedRfqId) {
    return <AdminRFQDetail rfqId={selectedRfqId} onBack={() => { setSelectedRfqId(null); refetch(); }} />;
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">إدارة طلبات عروض الأسعار</h1>
          <p className="text-stone-500 text-sm mt-1">إنشاء وإدارة دورة المشتريات الكاملة</p>
        </div>
        <Button
          className="bg-amber-800 hover:bg-amber-900 text-white"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4 ml-2" />
          طلب عرض سعر جديد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = rfqs?.filter((r: any) => r.status === status).length || 0;
          return (
            <Card key={status} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-stone-800">{count}</div>
                <Badge className={`text-xs mt-1 ${config.color}`}>{config.label}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
          className={filterStatus === "all" ? "bg-amber-800 hover:bg-amber-900" : ""}
        >
          الكل ({rfqs?.length || 0})
        </Button>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
            className={filterStatus === status ? "bg-amber-800 hover:bg-amber-900" : ""}
          >
            {config.label}
          </Button>
        ))}
      </div>

      {/* RFQ List */}
      <div className="space-y-3">
        {!rfqs || rfqs.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-stone-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات عروض أسعار</p>
              <Button className="mt-4 bg-amber-800 hover:bg-amber-900 text-white" onClick={() => setShowCreate(true)}>
                إنشاء طلب جديد
              </Button>
            </CardContent>
          </Card>
        ) : (
          rfqs.map((rfq: any) => (
            <Card
              key={rfq.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRfqId(rfq.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-stone-400">{rfq.rfqNumber}</span>
                      <Badge className={`text-xs ${STATUS_CONFIG[rfq.status]?.color || "bg-stone-100"}`}>
                        {STATUS_CONFIG[rfq.status]?.label || rfq.status}
                      </Badge>
                    </div>
                    <div className="font-semibold text-stone-800 mb-1">{rfq.title}</div>
                    {rfq.description && (
                      <p className="text-sm text-stone-500 line-clamp-1">{rfq.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        الموعد: {new Date(rfq.submissionDeadline).toLocaleDateString("ar-SA")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        الدعوات: {rfq.invitationsCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        العروض: {rfq.quotesCount}
                      </span>
                      {rfq.deliveryDays && <span>التوريد: {rfq.deliveryDays} يوم</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create RFQ Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-bold text-stone-800">إنشاء طلب عرض سعر جديد</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-2 hover:bg-stone-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-stone-700">عنوان الطلب *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="مثال: توريد أخشاب صنوبر للإنتاج Q3"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-stone-700">وصف الطلب</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="تفاصيل إضافية عن الطلب..."
                  rows={2}
                />
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-stone-700">البنود المطلوبة *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3 h-3 ml-1" />
                    إضافة بند
                  </Button>
                </div>
                {items.map((item, i) => (
                  <Card key={i} className="border border-stone-200">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-500">البند {i + 1}</span>
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-stone-600">اسم البند *</Label>
                          <Input
                            value={item.name}
                            onChange={e => updateItem(i, "name", e.target.value)}
                            placeholder="مثال: خشب صنوبر"
                            className="text-sm"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-stone-600">الوصف</Label>
                          <Input
                            value={item.description}
                            onChange={e => updateItem(i, "description", e.target.value)}
                            placeholder="وصف مختصر"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-stone-600">الكمية *</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.qty}
                            onChange={e => updateItem(i, "qty", parseFloat(e.target.value) || 1)}
                            className="text-sm"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-stone-600">الوحدة</Label>
                          <Input
                            value={item.unit}
                            onChange={e => updateItem(i, "unit", e.target.value)}
                            placeholder="قطعة / متر / كجم"
                            className="text-sm"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-stone-600">المواصفات التقنية</Label>
                          <Input
                            value={item.specs}
                            onChange={e => updateItem(i, "specs", e.target.value)}
                            placeholder="المواصفات والمعايير المطلوبة"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-stone-700">موقع التسليم</Label>
                  <Input
                    value={form.deliveryLocation}
                    onChange={e => setForm(p => ({ ...p, deliveryLocation: e.target.value }))}
                    placeholder="مثال: مصنع الرياض"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-stone-700">مدة التوريد المطلوبة (يوم)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.deliveryDays}
                    onChange={e => setForm(p => ({ ...p, deliveryDays: e.target.value }))}
                    placeholder="مثال: 14"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-stone-700">شروط الدفع</Label>
                  <Input
                    value={form.paymentTerms}
                    onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
                    placeholder="مثال: 30 يوم صافي"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-stone-700">الضمان المطلوب (شهر)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.warrantyMonths}
                    onChange={e => setForm(p => ({ ...p, warrantyMonths: e.target.value }))}
                    placeholder="مثال: 12"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-stone-700">الموعد النهائي لتقديم العروض *</Label>
                <Input
                  type="datetime-local"
                  value={form.submissionDeadline}
                  onChange={e => setForm(p => ({ ...p, submissionDeadline: e.target.value }))}
                  required
                  dir="ltr"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-amber-800 hover:bg-amber-900 text-white"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإنشاء...</>
                  ) : (
                    <><FileText className="w-4 h-4 ml-2" />إنشاء الطلب</>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
