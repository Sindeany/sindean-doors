import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Eye,
  CheckCircle,
  Archive,
  Search,
  ClipboardList,
  Edit,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { BOMForm } from "@/components/admin/BOMForm";
import { BOMViewer } from "@/components/admin/BOMViewer";

export default function AdminBOM() {
  const [openForm, setOpenForm] = useState(false);
  const [editBomId, setEditBomId] = useState<number | null>(null);
  const [viewingBomId, setViewingBomId] = useState<number | null>(null);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: bomList = [], isLoading, refetch } = trpc.bom.list.useQuery({
    search: search || undefined,
  });

  const approveMutation = trpc.bom.approve.useMutation({
    onSuccess: () => {
      toast.success("تم اعتماد وتفعيل قائمة المكونات بنجاح");
      refetch();
    },
    onError: (err: any) => {
      toast.error(`فشل اعتماد القائمة: ${err.message}`);
    },
  });

  const archiveMutation = trpc.bom.archive.useMutation({
    onSuccess: () => {
      toast.success("تم أرشفة قائمة المكونات بنجاح");
      refetch();
    },
    onError: (err: any) => {
      toast.error(`فشل أرشفة القائمة: ${err.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl px-2.5">مسودة</Badge>;
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl px-2.5">نشط</Badge>;
      case "archived":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-xl px-2.5">مؤرشف</Badge>;
      default:
        return <Badge className="rounded-xl">{status}</Badge>;
    }
  };

  const filteredBOMList = bomList.filter((bom: any) => {
    if (statusFilter !== "all" && bom.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* العنوان العلوي */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
            <ClipboardList className="w-7 h-7 text-emerald-600" />
            إدارة جداول المكونات (BOM)
          </h1>
          <p className="text-xs text-gray-400 mt-1">تحديد نسب المواد وتكاليف العمالة والهدر لكل نوع باب مصنع</p>
        </div>
        <Button
          onClick={() => {
            setEditBomId(null);
            setOpenForm(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-2.5 flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إنشاء BOM جديد
        </Button>
      </div>

      {/* الفلترة والبحث */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
            placeholder="ابحث باسم المنتج أو الرمز..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-500 whitespace-nowrap">تصفية حسب الحالة:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="active">نشط</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>
      </div>

      {/* نافذة إنشاء / تعديل الـ BOM */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3 text-right pr-6">
            <DialogTitle className="font-bold text-lg text-gray-900">
              {editBomId ? "تعديل جدول مكونات المنتج (BOM)" : "إنشاء جدول مكونات جديد (BOM)"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-2">
            <BOMForm
              editBomId={editBomId || undefined}
              onSuccess={() => {
                setOpenForm(false);
                setEditBomId(null);
                refetch();
              }}
              onCancel={() => {
                setOpenForm(false);
                setEditBomId(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض تفاصيل الـ BOM */}
      {viewingBomId && (
        <Dialog open={!!viewingBomId} onOpenChange={() => setViewingBomId(null)}>
          <DialogContent className="max-w-3xl rounded-2xl">
            <DialogHeader className="border-b border-gray-100 pb-3 text-right pr-6">
              <DialogTitle className="font-bold text-lg text-gray-900">تفاصيل شجرة المكونات وتكلفة الباب</DialogTitle>
            </DialogHeader>
            <div className="px-6 py-2">
              <BOMViewer bomId={viewingBomId} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* جدول البيانات */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm">جاري تحميل جداول المكونات...</p>
        </div>
      ) : filteredBOMList.length > 0 ? (
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50/70 font-bold">
              <TableRow className="border-b border-gray-100">
                <TableHead className="text-right">رمز المنتج (SKU)</TableHead>
                <TableHead className="text-right">اسم المنتج</TableHead>
                <TableHead className="text-right">الإصدار</TableHead>
                <TableHead className="text-right">التكلفة المقدرة</TableHead>
                <TableHead className="text-right">تكلفة العمل والعمالة</TableHead>
                <TableHead className="text-right">نسبة الهدر</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-center w-36">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-gray-700">
              {filteredBOMList.map(bom => (
                <TableRow key={bom.id} className="hover:bg-gray-50/40 transition-colors border-b border-gray-50">
                  <td className="px-4 py-4 font-bold text-gray-900 text-xs">{bom.productSku}</td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-gray-900">{bom.productName}</div>
                  </td>
                  <td className="px-4 py-4 font-medium">v{bom.version}</td>
                  <td className="px-4 py-4 font-bold text-emerald-700">
                    {bom.totalCost.toFixed(2)} ر.س
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {bom.laborCost.toFixed(2)} ر.س
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {bom.wastagePercentage}%
                  </td>
                  <td className="px-4 py-4">{getStatusBadge(bom.status)}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* عرض */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingBomId(bom.id)}
                        className="p-2 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition-all"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* تعديل */}
                      {bom.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditBomId(bom.id);
                            setOpenForm(true);
                          }}
                          className="p-2 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg transition-all"
                          title="تعديل المكونات"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}

                      {/* اعتماد */}
                      {bom.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من رغبتك في اعتماد قائمة المكونات هذه ونشرها كنسخة مفعلة؟")) {
                              approveMutation.mutate({ bomId: bom.id });
                            }
                          }}
                          className="p-2 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 rounded-lg transition-all"
                          title="اعتماد القائمة"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}

                      {/* أرشفة */}
                      {bom.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من رغبتك في أرشفة قائمة المكونات هذه؟")) {
                              archiveMutation.mutate({ bomId: bom.id });
                            }
                          }}
                          className="p-2 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-all"
                          title="أرشفة القائمة"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 rounded-2xl p-16 text-center text-gray-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-bold text-sm">لا توجد جداول مكونات مضافة بعد</p>
          <p className="text-xs text-gray-400 mt-1">اضغط على زر "إنشاء BOM جديد" للبدء في ربط المنتجات بمكوناتها التكليفية.</p>
        </div>
      )}
    </div>
  );
}
