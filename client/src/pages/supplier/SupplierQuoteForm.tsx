import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Send, Package, AlertCircle, CheckCircle } from "lucide-react";

interface Props {
  rfqId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupplierQuoteForm({
  rfqId,
  onClose,
  onSuccess,
}: Props) {
  const { data: rfqData, isLoading } = trpc.rfq.getById.useQuery({ id: rfqId });

  const [lineItems, setLineItems] = useState<
    Array<{
      itemIndex: number;
      unitPrice: number;
      totalPrice: number;
      notes: string;
    }>
  >([]);
  const [deliveryDays, setDeliveryDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("");
  const [notes, setNotes] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [error, setError] = useState("");

  const submitMutation = trpc.rfq.submitQuote.useMutation({
    onSuccess: () => onSuccess(),
    onError: err => setError(err.message),
  });

  // تهيئة بنود العرض عند تحميل بيانات الـ RFQ
  const initLineItems = () => {
    if (rfqData && lineItems.length === 0) {
      const items = rfqData.rfq.items as any[];
      setLineItems(
        items.map((_, i) => ({
          itemIndex: i,
          unitPrice: 0,
          totalPrice: 0,
          notes: "",
        }))
      );
    }
  };

  if (rfqData && lineItems.length === 0) initLineItems();

  const updateLineItem = (
    index: number,
    field: string,
    value: number | string
  ) => {
    setLineItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "unitPrice") {
          const rfqItems = rfqData?.rfq.items as any[];
          const qty = rfqItems?.[item.itemIndex]?.qty || 1;
          updated.totalPrice = Number(value) * qty;
        }
        return updated;
      })
    );
  };

  const totalPrice = lineItems.reduce(
    (sum, item) => sum + (item.totalPrice || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (lineItems.some(item => item.unitPrice <= 0)) {
      setError("يرجى إدخال سعر لجميع البنود");
      return;
    }
    submitMutation.mutate({
      rfqId,
      totalPrice,
      lineItems,
      deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
      paymentTerms: paymentTerms || undefined,
      warrantyMonths: warrantyMonths ? Number(warrantyMonths) : undefined,
      notes: notes || undefined,
      technicalNotes: technicalNotes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-800">تقديم عرض سعر</h2>
            {rfqData && (
              <p className="text-sm text-stone-500">{rfqData.rfq.title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-stone-400">
            جاري تحميل تفاصيل الطلب...
          </div>
        ) : rfqData ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* RFQ Details */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  تفاصيل الطلب
                </h3>
                <div className="text-sm text-amber-800 space-y-1">
                  {rfqData.rfq.description && <p>{rfqData.rfq.description}</p>}
                  <div className="flex gap-4 flex-wrap">
                    {rfqData.rfq.deliveryDays && (
                      <span>
                        المدة المطلوبة: {rfqData.rfq.deliveryDays} يوم
                      </span>
                    )}
                    {rfqData.rfq.paymentTerms && (
                      <span>شروط الدفع: {rfqData.rfq.paymentTerms}</span>
                    )}
                    {rfqData.rfq.warrantyMonths && (
                      <span>الضمان: {rfqData.rfq.warrantyMonths} شهر</span>
                    )}
                    <span>
                      الموعد النهائي:{" "}
                      {new Date(
                        rfqData.rfq.submissionDeadline
                      ).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-stone-800">بنود العرض</h3>
              {(rfqData.rfq.items as any[]).map((item, i) => (
                <Card key={i} className="border border-stone-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-stone-800">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-stone-500">
                            {item.description}
                          </div>
                        )}
                        {item.specs && (
                          <div className="text-xs text-amber-700 mt-1">
                            المواصفات: {item.specs}
                          </div>
                        )}
                        <div className="text-xs text-stone-400 mt-1">
                          الكمية: {item.qty} {item.unit}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-stone-600">
                          سعر الوحدة (ر.س) *
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={lineItems[i]?.unitPrice || ""}
                          onChange={e =>
                            updateLineItem(
                              i,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0.00"
                          className="text-sm"
                          required
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-stone-600">
                          الإجمالي (ر.س)
                        </Label>
                        <Input
                          type="number"
                          value={lineItems[i]?.totalPrice?.toFixed(2) || ""}
                          readOnly
                          className="text-sm bg-stone-50"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-stone-600">ملاحظة</Label>
                        <Input
                          value={lineItems[i]?.notes || ""}
                          onChange={e =>
                            updateLineItem(i, "notes", e.target.value)
                          }
                          placeholder="اختياري"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Total */}
              <div className="flex justify-end">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-6 py-3 text-right">
                  <div className="text-sm text-amber-700">الإجمالي الكلي</div>
                  <div className="text-2xl font-bold text-amber-900">
                    {totalPrice.toLocaleString()} ر.س
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-stone-700">
                  مدة التوريد (يوم)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={deliveryDays}
                  onChange={e => setDeliveryDays(e.target.value)}
                  placeholder="مثال: 14"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-stone-700">شروط الدفع</Label>
                <Input
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  placeholder="مثال: 30 يوم"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-stone-700">الضمان (شهر)</Label>
                <Input
                  type="number"
                  min="0"
                  value={warrantyMonths}
                  onChange={e => setWarrantyMonths(e.target.value)}
                  placeholder="مثال: 12"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-stone-700">ملاحظات عامة</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="أي ملاحظات إضافية على العرض..."
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-stone-700">ملاحظات تقنية</Label>
              <Textarea
                value={technicalNotes}
                onChange={e => setTechnicalNotes(e.target.value)}
                placeholder="المواصفات التقنية، شهادات الجودة، إلخ..."
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1 bg-amber-800 hover:bg-amber-900 text-white"
                disabled={submitMutation.isPending || totalPrice === 0}
              >
                <Send className="w-4 h-4 ml-2" />
                {submitMutation.isPending
                  ? "جاري الإرسال..."
                  : "إرسال عرض السعر"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center text-red-500">
            تعذر تحميل بيانات الطلب
          </div>
        )}
      </div>
    </div>
  );
}
