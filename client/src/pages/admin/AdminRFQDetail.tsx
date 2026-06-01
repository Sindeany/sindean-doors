import { useState } from "react";
import { trpc } from "@/lib/trpc";
import RFQComments from "@/components/RFQComments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight, Users, Send, BarChart3, Award, Brain, CheckCircle,
  Clock, AlertCircle, Star, TrendingUp, TrendingDown, Loader2,
  Package, FileText, ChevronDown, ChevronUp, X
} from "lucide-react";

interface Props {
  rfqId: number;
  onBack: () => void;
}

function QuoteLineItems({ lineItems, rfqItems }: { lineItems: any[]; rfqItems: any[] }) {
  return (
    <div>
      <div className="text-xs font-medium text-stone-500 mb-2">بنود العرض:</div>
      <div className="space-y-1">
        {lineItems.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-xs text-stone-600 bg-stone-50 px-3 py-1.5 rounded">
            <span>{String(rfqItems[item.itemIndex]?.name || `بند ${item.itemIndex + 1}`)}</span>
            <span className="font-medium">{Number(item.totalPrice).toLocaleString()} ر.س</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent: { label: "مرسلة", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "شوهدت", color: "bg-purple-100 text-purple-700" },
  accepted: { label: "مقبولة", color: "bg-green-100 text-green-700" },
  declined: { label: "مرفوضة", color: "bg-red-100 text-red-700" },
  submitted: { label: "قدّم عرضاً", color: "bg-amber-100 text-amber-700" },
  submitted_quote: { label: "قدّم عرضاً", color: "bg-amber-100 text-amber-700" },
  under_review: { label: "قيد المراجعة", color: "bg-blue-100 text-blue-700" },
  shortlisted: { label: "مختصرة", color: "bg-purple-100 text-purple-700" },
  awarded: { label: "فائز ✓", color: "bg-green-100 text-green-700" },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-700" },
};

export default function AdminRFQDetail({ rfqId, onBack }: Props) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [awardNotes, setAwardNotes] = useState("");
  const [showAwardConfirm, setShowAwardConfirm] = useState<number | null>(null);
  const [expandedQuote, setExpandedQuote] = useState<number | null>(null);

  const { data, refetch, isLoading } = trpc.rfq.getById.useQuery({ id: rfqId });

  const sendInvitationsMutation = trpc.rfq.sendInvitations.useMutation({
    onSuccess: () => { refetch(); setSelectedSuppliers([]); },
  });

  const evaluateMutation = trpc.rfq.evaluateWithAI.useMutation({
    onSuccess: () => refetch(),
  });

  const awardMutation = trpc.rfq.award.useMutation({
    onSuccess: () => { refetch(); setShowAwardConfirm(null); },
  });

  const { data: allSuppliers } = trpc.suppliers.list.useQuery({ status: "active" } as any);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
      </div>
    );
  }

  if (!data) return null;

  const { rfq, invitations, suppliers } = data;
  const quotes = data.quotes as Array<typeof data.quotes[number] & { lineItems: any[]; aiScoreBreakdown: any; aiRecommendation: string | null }>;
  const rfqItems = rfq.items as any[];
  const aiEval = rfq.aiEvaluation as any;

  // الموردون غير المدعوين
  const invitedSupplierIds = new Set(invitations.map(i => i.supplierId));
  const uninvitedSuppliers = (allSuppliers || []).filter(s => !invitedSupplierIds.has(s.id));

  const toggleSupplier = (id: number) => {
    setSelectedSuppliers(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const getSupplierName = (id: number) => suppliers.find(s => s.id === id)?.companyName || `مورد #${id}`;

  // ترتيب العروض حسب التقييم أو السعر
  const sortedQuotes = [...quotes].sort((a, b) => {
    if (a.aiScore != null && b.aiScore != null) return b.aiScore - a.aiScore;
    return a.totalPrice - b.totalPrice;
  });

  const winnerQuoteId = aiEval?.winner?.quoteId;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowRight className="w-4 h-4 ml-1" />
          العودة
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-stone-400">{rfq.rfqNumber}</span>
            <Badge className={`text-xs ${
              rfq.status === "draft" ? "bg-stone-100 text-stone-600" :
              rfq.status === "published" ? "bg-blue-100 text-blue-700" :
              rfq.status === "evaluated" ? "bg-purple-100 text-purple-700" :
              rfq.status === "awarded" ? "bg-green-100 text-green-700" :
              "bg-amber-100 text-amber-700"
            }`}>
                  {String(rfq.status === "draft" ? "مسودة" : rfq.status === "published" ? "منشور" :
               rfq.status === "evaluated" ? "تم التقييم" : rfq.status === "awarded" ? "تمت الترسية" : rfq.status)}
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-stone-800">{rfq.title}</h1>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="invitations">
            الدعوات ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="quotes">
            العروض ({quotes.length})
          </TabsTrigger>
          {quotes.length > 0 && (
            <TabsTrigger value="comparison">المقارنة والتقييم</TabsTrigger>
          )}
          <TabsTrigger value="comments">
            التعليقات
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-stone-600">تفاصيل الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {rfq.description && <p className="text-stone-600">{rfq.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-stone-400">الموعد النهائي:</span> <span className="font-medium">{new Date(rfq.submissionDeadline).toLocaleDateString("ar-SA")}</span></div>
                  {rfq.deliveryDays && <div><span className="text-stone-400">مدة التوريد:</span> <span className="font-medium">{rfq.deliveryDays} يوم</span></div>}
                  {rfq.paymentTerms && <div><span className="text-stone-400">شروط الدفع:</span> <span className="font-medium">{rfq.paymentTerms}</span></div>}
                  {rfq.warrantyMonths && <div><span className="text-stone-400">الضمان:</span> <span className="font-medium">{rfq.warrantyMonths} شهر</span></div>}
                  {rfq.deliveryLocation && <div><span className="text-stone-400">موقع التسليم:</span> <span className="font-medium">{rfq.deliveryLocation}</span></div>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-stone-600">البنود المطلوبة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rfqItems.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <div className="font-medium text-stone-800">{item.name}</div>
                        <div className="text-xs text-stone-400">{item.qty} {item.unit}{item.description ? ` — ${item.description}` : ""}</div>
                        {item.specs && <div className="text-xs text-amber-700">{item.specs}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="p-4">
                <div className="text-3xl font-bold text-blue-700">{invitations.length}</div>
                <div className="text-xs text-stone-500">دعوات مرسلة</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="p-4">
                <div className="text-3xl font-bold text-amber-700">{quotes.length}</div>
                <div className="text-xs text-stone-500">عروض مستلمة</div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="p-4">
                <div className="text-3xl font-bold text-green-700">
                  {invitations.length > 0 ? Math.round((quotes.length / invitations.length) * 100) : 0}%
                </div>
                <div className="text-xs text-stone-500">نسبة الاستجابة</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Invitations ── */}
        <TabsContent value="invitations">
          <div className="space-y-4">
            {/* Send Invitations */}
            {rfq.status !== "awarded" && rfq.status !== "cancelled" && uninvitedSuppliers.length > 0 && (
              <Card className="border-0 shadow-sm border-r-4 border-r-blue-500">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    إرسال دعوات لموردين جدد
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {uninvitedSuppliers.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSupplier(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                          selectedSuppliers.includes(s.id)
                            ? "bg-amber-800 text-white border-amber-800"
                            : "bg-white text-stone-600 border-stone-200 hover:border-amber-400"
                        }`}
                      >
                        {s.companyName}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="bg-amber-800 hover:bg-amber-900 text-white"
                    disabled={selectedSuppliers.length === 0 || sendInvitationsMutation.isPending}
                    onClick={() => sendInvitationsMutation.mutate({ rfqId, supplierIds: selectedSuppliers })}
                  >
                    {sendInvitationsMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإرسال...</>
                    ) : (
                      <><Send className="w-4 h-4 ml-2" />إرسال الدعوات ({selectedSuppliers.length})</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Invitations List */}
            <div className="space-y-2">
              {invitations.length === 0 ? (
                <div className="text-center py-8 text-stone-400">لم يتم إرسال دعوات بعد</div>
              ) : (
                invitations.map(inv => (
                  <Card key={inv.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-stone-800">{getSupplierName(inv.supplierId)}</div>
                        <div className="text-xs text-stone-400">
                          أُرسلت: {new Date(inv.sentAt).toLocaleDateString("ar-SA")}
                          {inv.viewedAt && ` · شوهدت: ${new Date(inv.viewedAt).toLocaleDateString("ar-SA")}`}
                        </div>
                      </div>
                      <Badge className={`text-xs ${STATUS_LABELS[inv.status]?.color || "bg-stone-100"}`}>
                        {STATUS_LABELS[inv.status]?.label || inv.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Quotes ── */}
        <TabsContent value="quotes">
          <div className="space-y-3">
            {quotes.length === 0 ? (
              <div className="text-center py-8 text-stone-400">لم تصل عروض بعد</div>
            ) : (
              sortedQuotes.map((quote, rank) => {
                const isWinner = quote.id === winnerQuoteId;
                const isExpanded = expandedQuote === quote.id;
                return (
                  <Card key={quote.id} className={`border-0 shadow-sm ${isWinner ? "border-2 border-green-400" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isWinner && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Award className="w-3 h-3" />توصية AI</span>}
                            <span className="font-semibold text-stone-800">{getSupplierName(quote.supplierId)}</span>
                            <Badge className={`text-xs ${STATUS_LABELS[quote.status]?.color || "bg-stone-100"}`}>
                              {STATUS_LABELS[quote.status]?.label || quote.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                            <span className="font-bold text-amber-800 text-base">{quote.totalPrice.toLocaleString()} ر.س</span>
                            {quote.deliveryDays && <span>التوريد: {quote.deliveryDays} يوم</span>}
                            {quote.paymentTerms && <span>الدفع: {quote.paymentTerms}</span>}
                            {quote.warrantyMonths && <span>الضمان: {quote.warrantyMonths} شهر</span>}
                          </div>

                          {/* AI Score Bar */}
                          {quote.aiScore != null && (() => {
                            const score = Number(quote.aiScore);
                            return (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-stone-400">تقييم AI:</span>
                              <div className="flex-1 bg-stone-200 rounded-full h-2 max-w-48">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    score >= 70 ? "bg-green-500" :
                                    score >= 50 ? "bg-amber-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold">{Math.round(score)}/100</span>
                            </div>
                            );
                          })()}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedQuote(isExpanded ? null : quote.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          {rfq.status !== "awarded" && rfq.status !== "cancelled" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => setShowAwardConfirm(quote.id)}
                            >
                              <Award className="w-3 h-3 ml-1" />
                              ترسية
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
                          {/* Line Items */}
                          <QuoteLineItems lineItems={(quote.lineItems as any[]) || []} rfqItems={rfqItems} />

                          {/* AI Breakdown */}
                          {quote.aiScoreBreakdown && (
                            <div>
                              <div className="text-xs font-medium text-stone-500 mb-2">تفصيل التقييم:</div>
                              <div className="grid grid-cols-5 gap-2">
                                {Object.entries(quote.aiScoreBreakdown as Record<string, unknown>).map(([key, val]) => {
                                  const labels: Record<string, string> = {
                                    price: "السعر", delivery: "التوريد", payment: "الدفع",
                                    warranty: "الضمان", history: "السجل"
                                  };
                                  return (
                                    <div key={key} className="text-center bg-stone-50 rounded p-2">
                                      <div className="text-sm font-bold text-stone-800">{String(val)}</div>
                                      <div className="text-xs text-stone-400">{labels[key] || key}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {quote.aiRecommendation && (
                            <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                              <span className="font-medium">تعليق AI: </span>{quote.aiRecommendation}
                            </div>
                          )}

                           {quote.notes && (
                             <div className="text-xs text-stone-500">
                               <span className="font-medium">ملاحظات المورد: </span>{quote.notes}
                             </div>
                           )}
                         </div>
                       )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ── Comparison & AI Evaluation ── */}
        {quotes.length > 0 && (
          <TabsContent value="comparison">
            <div className="space-y-4">
              {/* AI Evaluate Button */}
              {rfq.status !== "awarded" && rfq.status !== "cancelled" && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-blue-50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-stone-800 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        التقييم بالذكاء الاصطناعي
                      </div>
                      <div className="text-sm text-stone-500 mt-1">
                        يقيّم AI جميع العروض ويعطي توصية بأفضل مورد بناءً على السعر، التوريد، الدفع، الضمان، والسجل
                      </div>
                    </div>
                    <Button
                      className="bg-purple-700 hover:bg-purple-800 text-white shrink-0"
                      onClick={() => evaluateMutation.mutate({ rfqId })}
                      disabled={evaluateMutation.isPending}
                    >
                      {evaluateMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري التقييم...</>
                      ) : (
                        <><Brain className="w-4 h-4 ml-2" />{aiEval ? "إعادة التقييم" : "تقييم العروض"}</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* AI Summary */}
              {aiEval && (
                <Card className="border-0 shadow-sm border-r-4 border-r-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Brain className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-stone-800 mb-1">ملخص التقييم</div>
                        <p className="text-sm text-stone-600">{aiEval.summary}</p>
                        {aiEval.winner && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="font-semibold text-green-800 flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              التوصية: {getSupplierName(quotes.find(q => q.id === aiEval.winner.quoteId)?.supplierId || 0)}
                            </div>
                            <p className="text-sm text-green-700 mt-1">{aiEval.winner.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comparison Table */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-stone-600">مقارنة العروض</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50">
                        <tr>
                          <th className="text-right px-4 py-2 text-stone-600 font-medium">المورد</th>
                          <th className="text-center px-4 py-2 text-stone-600 font-medium">السعر</th>
                          <th className="text-center px-4 py-2 text-stone-600 font-medium">التوريد</th>
                          <th className="text-center px-4 py-2 text-stone-600 font-medium">الدفع</th>
                          <th className="text-center px-4 py-2 text-stone-600 font-medium">الضمان</th>
                          <th className="text-center px-4 py-2 text-stone-600 font-medium">تقييم AI</th>
                          <th className="text-center px-4 py-2 text-stone-600 font-medium">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedQuotes.map((quote, i) => {
                          const isWinner = quote.id === winnerQuoteId;
                          const minPrice = Math.min(...quotes.map(q => q.totalPrice));
                          const minDelivery = Math.min(...quotes.filter(q => q.deliveryDays).map(q => q.deliveryDays!));
                          return (
                            <tr key={quote.id} className={`border-t ${isWinner ? "bg-green-50" : i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {isWinner && <Award className="w-3.5 h-3.5 text-green-600" />}
                                  <span className="font-medium">{getSupplierName(quote.supplierId)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-bold ${quote.totalPrice === minPrice ? "text-green-700" : "text-stone-700"}`}>
                                  {quote.totalPrice.toLocaleString()}
                                </span>
                                {quote.totalPrice === minPrice && <span className="text-xs text-green-600 mr-1">✓</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={quote.deliveryDays === minDelivery ? "text-green-700 font-medium" : "text-stone-600"}>
                                  {quote.deliveryDays ? `${quote.deliveryDays} يوم` : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-stone-600 text-xs">{quote.paymentTerms || "—"}</td>
                              <td className="px-4 py-3 text-center text-stone-600">{quote.warrantyMonths ? `${quote.warrantyMonths}م` : "—"}</td>
                              <td className="px-4 py-3 text-center">
                                {quote.aiScore != null ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <div className="w-16 bg-stone-200 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${quote.aiScore >= 70 ? "bg-green-500" : quote.aiScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                        style={{ width: `${quote.aiScore}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold">{Math.round(quote.aiScore)}</span>
                                  </div>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {rfq.status !== "awarded" && rfq.status !== "cancelled" && (
                                  <Button
                                    size="sm"
                                    className={`text-xs ${isWinner ? "bg-green-600 hover:bg-green-700" : "bg-amber-700 hover:bg-amber-800"} text-white`}
                                    onClick={() => setShowAwardConfirm(quote.id)}
                                  >
                                    ترسية
                                  </Button>
                                )}
                                {rfq.status === "awarded" && quote.status === "awarded" && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">فائز</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ── Comments Tab ── */}
        <TabsContent value="comments">
          <div className="space-y-4">
            <div className="text-sm text-stone-500 bg-stone-50 rounded-lg p-3 border border-stone-200">
              يمكنك استخدام هذا القسم للتواصل مع الموردين بشأن الشروط والمواصفات. التعليقات الداخلية لا تظهر للموردين.
            </div>
            <RFQComments
              rfqId={rfqId}
              viewer={{ type: "admin" }}
              viewerName="الإدارة"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Award Confirmation Modal */}
      {showAwardConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <Card className="w-full max-w-md shadow-2xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-bold text-stone-800">تأكيد الترسية</div>
                  <div className="text-sm text-stone-500">
                    ترسية العقد على: {getSupplierName(quotes.find(q => q.id === showAwardConfirm)?.supplierId || 0)}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-stone-600 block mb-1">ملاحظات الترسية (اختياري)</label>
                  <Textarea
                    value={awardNotes}
                    onChange={e => setAwardNotes(e.target.value)}
                    placeholder="أسباب الاختيار أو شروط إضافية..."
                    rows={3}
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-700">
                  سيتم إنشاء أمر شراء تلقائياً وإرسال إشعار للمورد الفائز
                </div>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => awardMutation.mutate({ rfqId, quoteId: showAwardConfirm, awardNotes: awardNotes || undefined })}
                    disabled={awardMutation.isPending}
                  >
                    {awardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الترسية"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAwardConfirm(null)}>إلغاء</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
