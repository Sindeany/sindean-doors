import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupplierAuth } from "@/contexts/SupplierAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, LogOut, FileText, Package, Bell, Star, TrendingUp,
  Clock, CheckCircle, XCircle, Eye, Send, AlertCircle, ChevronRight,
  ShoppingCart, Award, MessageSquare
} from "lucide-react";
import SupplierQuoteForm from "./SupplierQuoteForm";
import RFQComments from "@/components/RFQComments";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent: { label: "مرسلة", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "تمت المشاهدة", color: "bg-purple-100 text-purple-700" },
  accepted: { label: "مقبولة", color: "bg-green-100 text-green-700" },
  declined: { label: "مرفوضة", color: "bg-red-100 text-red-700" },
  submitted: { label: "تم تقديم عرض", color: "bg-amber-100 text-amber-700" },
  under_review: { label: "قيد المراجعة", color: "bg-blue-100 text-blue-700" },
  shortlisted: { label: "في القائمة المختصرة", color: "bg-purple-100 text-purple-700" },
  awarded: { label: "فاز بالترسية ✓", color: "bg-green-100 text-green-700" },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-700" },
  issued: { label: "صادر", color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "مؤكد", color: "bg-green-100 text-green-700" },
  in_progress: { label: "جاري التنفيذ", color: "bg-amber-100 text-amber-700" },
  delivered: { label: "تم التسليم", color: "bg-green-100 text-green-700" },
  invoiced: { label: "صدرت فاتورة", color: "bg-purple-100 text-purple-700" },
  paid: { label: "تم الدفع ✓", color: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-700" },
};

export default function SupplierDashboard() {
  const [, navigate] = useLocation();
  const { supplier, isLoading, logout } = useSupplierAuth();
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [selectedInvitationId, setSelectedInvitationId] = useState<number | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  useEffect(() => {
    if (!isLoading && !supplier) navigate("/supplier/login");
  }, [supplier, isLoading]);

  const { data: invitations, refetch: refetchInvitations } = trpc.suppliers.myInvitations.useQuery(undefined, {
    enabled: !!supplier,
  });

  const { data: quotes, refetch: refetchQuotes } = trpc.suppliers.myQuotes.useQuery(undefined, {
    enabled: !!supplier,
  });

  const { data: purchaseOrders, refetch: refetchPOs } = trpc.suppliers.myPurchaseOrders.useQuery(undefined, {
    enabled: !!supplier,
  });

  const confirmPOMutation = trpc.suppliers.confirmPurchaseOrder.useMutation({
    onSuccess: () => refetchPOs(),
  });

  const markViewedMutation = trpc.rfq.markInvitationViewed.useMutation({
    onSuccess: () => refetchInvitations(),
  });

  const respondMutation = trpc.rfq.respondToInvitation.useMutation({
    onSuccess: () => refetchInvitations(),
  });

  if (!supplier) return null;

  const pendingInvitations = invitations?.filter(i => i.status === "sent" || i.status === "viewed") || [];
  const activeQuotes = quotes?.filter(q => q.status !== "rejected" && q.status !== "awarded") || [];
  const activePOs = purchaseOrders?.filter(po => po.status !== "paid" && po.status !== "cancelled") || [];

  const handleOpenRFQ = (inv: any) => {
    setSelectedRfqId(inv.rfqId);
    setSelectedInvitationId(inv.id);
    if (inv.status === "sent" && supplier) {
      markViewedMutation.mutate({ invitationId: inv.id });
    }
  };

  const handleSubmitQuote = (inv: any) => {
    setSelectedRfqId(inv.rfqId);
    setSelectedInvitationId(inv.id);
    setShowQuoteForm(true);
  };

  return (
    <div className="min-h-screen bg-stone-50" dir="rtl">
      {/* Header */}
      <header className="bg-amber-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-700 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg">{supplier.companyName}</div>
              <div className="text-amber-200 text-xs">{supplier.contactName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={supplier.status === "active" ? "bg-green-500" : "bg-amber-500"}>
              {supplier.status === "active" ? "نشط" : supplier.status === "pending" ? "قيد المراجعة" : "معلق"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-amber-800"
              onClick={() => { logout(); navigate("/supplier/login"); }}
            >
              <LogOut className="w-4 h-4 ml-1" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-stone-800">{pendingInvitations.length}</div>
                <div className="text-xs text-stone-500">دعوات جديدة</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-stone-800">{activeQuotes.length}</div>
                <div className="text-xs text-stone-500">عروض نشطة</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-stone-800">{activePOs.length}</div>
                <div className="text-xs text-stone-500">أوامر شراء</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-stone-800">{supplier.wonQuotes || 0}</div>
                <div className="text-xs text-stone-500">طلبات فائزة</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="invitations">
          <TabsList className="mb-4">
            <TabsTrigger value="invitations" className="gap-1">
              <Bell className="w-4 h-4" />
              الدعوات
              {pendingInvitations.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-1">
                  {pendingInvitations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="quotes" className="gap-1">
              <FileText className="w-4 h-4" />
              عروضي
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1">
              <MessageSquare className="w-4 h-4" />
              الرسائل
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1">
              <Package className="w-4 h-4" />
              أوامر الشراء
            </TabsTrigger>
          </TabsList>

          {/* ── Invitations Tab ── */}
          <TabsContent value="invitations">
            <div className="space-y-3">
              {!invitations || invitations.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-stone-400">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد دعوات حتى الآن</p>
                  </CardContent>
                </Card>
              ) : (
                invitations.map((inv: any) => (
                  <Card key={inv.id} className={`border-0 shadow-sm transition-all ${inv.status === "sent" ? "border-r-4 border-r-blue-500" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-stone-800 truncate">
                              {inv.rfq?.title || `طلب #${inv.rfqId}`}
                            </span>
                            <Badge className={`text-xs shrink-0 ${STATUS_LABELS[inv.status]?.color || "bg-stone-100 text-stone-600"}`}>
                              {STATUS_LABELS[inv.status]?.label || inv.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-stone-500 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              الموعد النهائي: {inv.rfq ? new Date(inv.rfq.submissionDeadline).toLocaleDateString("ar-SA") : "—"}
                            </span>
                            {inv.rfq?.deliveryDays && (
                              <span>مدة التوريد: {inv.rfq.deliveryDays} يوم</span>
                            )}
                          </div>
                          {inv.rfq?.description && (
                            <p className="text-sm text-stone-600 mt-1 line-clamp-2">{inv.rfq.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {(inv.status === "sent" || inv.status === "viewed" || inv.status === "accepted") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRFQ(inv)}
                                className="text-xs"
                              >
                                <Eye className="w-3 h-3 ml-1" />
                                عرض
                              </Button>
                              <Button
                                size="sm"
                                className="bg-amber-800 hover:bg-amber-900 text-white text-xs"
                                onClick={() => handleSubmitQuote(inv)}
                              >
                                <Send className="w-3 h-3 ml-1" />
                                تقديم عرض
                              </Button>
                            </>
                          )}
                          {inv.status === "submitted" && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 ml-1" />
                              تم تقديم العرض
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Messages Tab ── */}
          <TabsContent value="messages">
            <div className="space-y-4">
              <div className="text-sm text-stone-500 bg-stone-50 rounded-lg p-3 border border-stone-200">
                هنا يمكنك التواصل مع فريق المشتريات بشأن طلبات التسعير والاستفسار عن المواصفات.
              </div>
              {invitations && invitations.length > 0 ? (
                invitations.map((inv: any) => (
                  <div key={inv.rfqId} className="space-y-2">
                    <div className="text-sm font-semibold text-stone-700 px-1">
                      {inv.rfq?.title || `طلب #${inv.rfqId}`}
                    </div>
                    <RFQComments
                      rfqId={inv.rfqId}
                      viewer={{
                        type: "supplier",
                        id: supplier?.id,
                      }}
                      viewerName={supplier?.companyName}
                    />
                  </div>
                ))
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-stone-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد دعوات بعد</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Quotes Tab ── */}
          <TabsContent value="quotes">
            <div className="space-y-3">
              {!quotes || quotes.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-stone-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لم تقدم أي عروض بعد</p>
                  </CardContent>
                </Card>
              ) : (
                quotes.map((q: any) => (
                  <Card key={q.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-stone-800">
                              {q.rfq?.title || `طلب #${q.rfqId}`}
                            </span>
                            <Badge className={`text-xs ${STATUS_LABELS[q.status]?.color || "bg-stone-100"}`}>
                              {STATUS_LABELS[q.status]?.label || q.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-stone-500 flex items-center gap-3">
                            <span>رقم العرض: {q.quoteNumber || "—"}</span>
                            <span>السعر: {q.totalPrice.toLocaleString()} ر.س</span>
                            {q.deliveryDays && <span>التوريد: {q.deliveryDays} يوم</span>}
                          </div>
                          {q.aiScore != null && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="text-xs text-stone-500">تقييم AI:</div>
                              <div className="flex-1 bg-stone-200 rounded-full h-1.5 max-w-32">
                                <div
                                  className={`h-1.5 rounded-full ${q.aiScore >= 70 ? "bg-green-500" : q.aiScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                  style={{ width: `${q.aiScore}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{Math.round(q.aiScore)}/100</span>
                            </div>
                          )}
                          {q.aiRecommendation && (
                            <p className="text-xs text-stone-500 mt-1 italic">{q.aiRecommendation}</p>
                          )}
                        </div>
                        <div className="text-left shrink-0">
                          <div className="text-lg font-bold text-amber-800">{q.totalPrice.toLocaleString()}</div>
                          <div className="text-xs text-stone-400">ر.س</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ── Purchase Orders Tab ── */}
          <TabsContent value="orders">
            <div className="space-y-3">
              {!purchaseOrders || purchaseOrders.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-stone-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد أوامر شراء حتى الآن</p>
                  </CardContent>
                </Card>
              ) : (
                purchaseOrders.map((po: any) => (
                  <Card key={po.id} className={`border-0 shadow-sm ${po.status === "issued" ? "border-r-4 border-r-amber-500" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-stone-800">{po.title}</span>
                            <Badge className={`text-xs ${STATUS_LABELS[po.status]?.color || "bg-stone-100"}`}>
                              {STATUS_LABELS[po.status]?.label || po.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-stone-500 flex items-center gap-3">
                            <span>رقم الأمر: {po.poNumber}</span>
                            <span>الإجمالي: {po.totalPrice.toLocaleString()} ر.س</span>
                            {po.deliveryDays && <span>التوريد: {po.deliveryDays} يوم</span>}
                          </div>
                          {po.paymentTerms && (
                            <div className="text-xs text-stone-400 mt-1">شروط الدفع: {po.paymentTerms}</div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {po.status === "issued" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => confirmPOMutation.mutate({ poId: po.id })}
                              disabled={confirmPOMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 ml-1" />
                              تأكيد الاستلام
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quote Form Modal */}
      {showQuoteForm && selectedRfqId && selectedInvitationId && supplier && (
        <SupplierQuoteForm
          rfqId={selectedRfqId}
          onClose={() => setShowQuoteForm(false)}
          onSuccess={() => {
            setShowQuoteForm(false);
            refetchInvitations();
            refetchQuotes();
          }}
        />
      )}
    </div>
  );
}
