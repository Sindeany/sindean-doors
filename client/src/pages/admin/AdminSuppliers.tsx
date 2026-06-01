import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Search, CheckCircle, XCircle, Clock, Star,
  Phone, Mail, MapPin, Globe, Tag, MoreVertical, Eye
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG = {
  pending: { label: "قيد المراجعة", color: "bg-amber-100 text-amber-700", icon: Clock },
  active: { label: "نشط", color: "bg-green-100 text-green-700", icon: CheckCircle },
  suspended: { label: "معلق", color: "bg-red-100 text-red-700", icon: XCircle },
};

const CATEGORY_LABELS: Record<string, string> = {
  wood: "أخشاب", hardware: "أجهزة", glass: "زجاج", paint: "دهانات",
  metal: "معادن", foam: "إسفنج", packaging: "تغليف", tools: "أدوات", other: "أخرى",
};

export default function AdminSuppliers() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  const { data: suppliers, refetch } = trpc.suppliers.list.useQuery(
    filterStatus !== "all" ? { status: filterStatus as any } : undefined
  );

  const updateStatusMutation = trpc.suppliers.updateStatus.useMutation({
    onSuccess: () => { refetch(); setSelectedSupplier(null); },
  });

  const filtered = (suppliers || []).filter(s =>
    !search || s.companyName.includes(search) || s.contactName.includes(search) || s.email.includes(search)
  );

  const stats = {
    total: suppliers?.length || 0,
    active: suppliers?.filter(s => s.status === "active").length || 0,
    pending: suppliers?.filter(s => s.status === "pending").length || 0,
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">إدارة الموردين</h1>
          <p className="text-stone-500 text-sm mt-1">إدارة الموردين المسجلين في المنصة</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي الموردين", value: stats.total, color: "text-stone-800" },
          { label: "موردون نشطون", value: stats.active, color: "text-green-700" },
          { label: "قيد المراجعة", value: stats.pending, color: "text-amber-700" },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-stone-500 mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم الشركة أو البريد..."
            className="pr-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "active", "suspended"].map(s => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className={filterStatus === s ? "bg-amber-800 hover:bg-amber-900" : ""}
            >
              {s === "all" ? "الكل" : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label || s}
            </Button>
          ))}
        </div>
      </div>

      {/* Suppliers List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-stone-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا يوجد موردون</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((supplier: any) => {
            const StatusIcon = STATUS_CONFIG[supplier.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
            return (
              <Card key={supplier.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <div className="font-semibold text-stone-800">{supplier.companyName}</div>
                          <div className="text-xs text-stone-500">{supplier.contactName}</div>
                        </div>
                        <Badge className={`text-xs mr-auto ${STATUS_CONFIG[supplier.status as keyof typeof STATUS_CONFIG]?.color || "bg-stone-100"}`}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {STATUS_CONFIG[supplier.status as keyof typeof STATUS_CONFIG]?.label || supplier.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />{supplier.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />{supplier.phone}
                        </span>
                        {supplier.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{supplier.city}
                          </span>
                        )}
                        {supplier.website && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <a href={supplier.website} target="_blank" className="text-blue-500 hover:underline">{supplier.website}</a>
                          </span>
                        )}
                      </div>

                      {supplier.categories && (supplier.categories as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(supplier.categories as string[]).map(cat => (
                            <span key={cat} className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full text-xs">
                              {CATEGORY_LABELS[cat] || cat}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                        <span>العروض: {supplier.totalQuotes || 0}</span>
                        <span>الفائزة: {supplier.wonQuotes || 0}</span>
                        {supplier.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {supplier.rating.toFixed(1)}
                          </span>
                        )}
                        <span>منذ: {new Date(supplier.createdAt).toLocaleDateString("ar-SA")}</span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {supplier.status !== "active" && (
                          <DropdownMenuItem
                            className="text-green-700"
                            onClick={() => updateStatusMutation.mutate({ id: supplier.id, status: "active" })}
                          >
                            <CheckCircle className="w-4 h-4 ml-2" />
                            تفعيل الحساب
                          </DropdownMenuItem>
                        )}
                        {supplier.status !== "pending" && (
                          <DropdownMenuItem
                            className="text-amber-700"
                            onClick={() => updateStatusMutation.mutate({ id: supplier.id, status: "pending" })}
                          >
                            <Clock className="w-4 h-4 ml-2" />
                            إعادة للمراجعة
                          </DropdownMenuItem>
                        )}
                        {supplier.status !== "suspended" && (
                          <DropdownMenuItem
                            className="text-red-700"
                            onClick={() => updateStatusMutation.mutate({ id: supplier.id, status: "suspended" })}
                          >
                            <XCircle className="w-4 h-4 ml-2" />
                            تعليق الحساب
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
