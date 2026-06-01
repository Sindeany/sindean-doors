// ============================================================
// Distributor Portal Data - Sindian Doors
// Design: Architectural Luxury | Oak Green + Copper + Beige
// ============================================================

export interface DistributorOrder {
  id: string;
  orderNumber: string;
  date: string;
  products: { name: string; qty: number; unitPrice: number; total: number }[];
  totalAmount: number;
  status: "pending" | "confirmed" | "manufacturing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  deliveryDate: string;
  notes?: string;
  trackingNumber?: string;
}

export interface DistributorProfile {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  discount: number;
  creditLimit: number;
  creditUsed: number;
  joinDate: string;
  salesRep: string;
}

export interface MonthlySales {
  month: string;
  orders: number;
  revenue: number;
  units: number;
}

export interface ProductPerformance {
  name: string;
  units: number;
  revenue: number;
  growth: number;
}

// Mock distributor profile
export const mockDistributor: DistributorProfile = {
  id: "DIST-001",
  name: "محمد العمري",
  company: "شركة العمري للمقاولات",
  email: "m.omari@omari-contracting.sa",
  phone: "0501234567",
  city: "الرياض",
  tier: "gold",
  discount: 25,
  creditLimit: 500000,
  creditUsed: 187500,
  joinDate: "2022-03-15",
  salesRep: "أحمد الزهراني",
};

// Mock orders data
export const mockOrders: DistributorOrder[] = [
  {
    id: "ORD-001",
    orderNumber: "SND-2026-0041",
    date: "2026-04-15",
    products: [
      { name: "باب كلاسيكي من خشب السنديان", qty: 20, unitPrice: 900, total: 18000 },
      { name: "باب عصري بقشرة الجوز", qty: 10, unitPrice: 1087.5, total: 10875 },
    ],
    totalAmount: 28875,
    status: "manufacturing",
    paymentStatus: "partial",
    deliveryDate: "2026-05-01",
    notes: "مشروع فيلا الرياض - الدور الأول",
    trackingNumber: "TRK-20260415-001",
  },
  {
    id: "ORD-002",
    orderNumber: "SND-2026-0038",
    date: "2026-04-08",
    products: [
      { name: "باب مقاوم للحريق 60 دقيقة", qty: 15, unitPrice: 1350, total: 20250 },
      { name: "طقم مقابض وأقفال فاخرة", qty: 15, unitPrice: 285, total: 4275 },
    ],
    totalAmount: 24525,
    status: "shipped",
    paymentStatus: "paid",
    deliveryDate: "2026-04-20",
    trackingNumber: "TRK-20260408-002",
  },
  {
    id: "ORD-003",
    orderNumber: "SND-2026-0035",
    date: "2026-03-28",
    products: [
      { name: "باب رئيسي فاخر محفور", qty: 5, unitPrice: 2100, total: 10500 },
      { name: "باب خارجي بنافذة جانبية", qty: 8, unitPrice: 2400, total: 19200 },
    ],
    totalAmount: 29700,
    status: "delivered",
    paymentStatus: "paid",
    deliveryDate: "2026-04-10",
    trackingNumber: "TRK-20260328-003",
  },
  {
    id: "ORD-004",
    orderNumber: "SND-2026-0029",
    date: "2026-03-15",
    products: [
      { name: "باب داخلي ساج طبيعي", qty: 30, unitPrice: 1425, total: 42750 },
    ],
    totalAmount: 42750,
    status: "delivered",
    paymentStatus: "paid",
    deliveryDate: "2026-03-30",
    trackingNumber: "TRK-20260315-004",
  },
  {
    id: "ORD-005",
    orderNumber: "SND-2026-0022",
    date: "2026-02-20",
    products: [
      { name: "باب عازل للصوت - درجة احترافية", qty: 12, unitPrice: 1575, total: 18900 },
      { name: "باب داخلي بإطار مزدوج", qty: 8, unitPrice: 1237.5, total: 9900 },
    ],
    totalAmount: 28800,
    status: "delivered",
    paymentStatus: "paid",
    deliveryDate: "2026-03-05",
  },
  {
    id: "ORD-006",
    orderNumber: "SND-2026-0051",
    date: "2026-04-18",
    products: [
      { name: "باب كلاسيكي من خشب السنديان", qty: 5, unitPrice: 900, total: 4500 },
    ],
    totalAmount: 4500,
    status: "pending",
    paymentStatus: "unpaid",
    deliveryDate: "2026-05-10",
    notes: "طلب جديد - في انتظار التأكيد",
  },
];

// Monthly sales data for charts
export const monthlySalesData: MonthlySales[] = [
  { month: "نوفمبر", orders: 3, revenue: 45200, units: 48 },
  { month: "ديسمبر", orders: 5, revenue: 72800, units: 82 },
  { month: "يناير", orders: 4, revenue: 58400, units: 63 },
  { month: "فبراير", orders: 6, revenue: 89600, units: 97 },
  { month: "مارس", orders: 8, revenue: 124300, units: 138 },
  { month: "أبريل", orders: 5, revenue: 87500, units: 95 },
];

// Product performance data
export const productPerformanceData: ProductPerformance[] = [
  { name: "باب كلاسيكي سنديان", units: 85, revenue: 76500, growth: 18 },
  { name: "باب داخلي ساج", units: 72, revenue: 102600, growth: 24 },
  { name: "باب مقاوم للحريق", units: 54, revenue: 97200, growth: 31 },
  { name: "باب عصري جوز", units: 48, revenue: 69600, growth: 12 },
  { name: "باب عازل للصوت", units: 36, revenue: 75600, growth: 8 },
];

// Distributor tier config
export const tierConfig = {
  bronze: { label: "برونزي", color: "#CD7F32", minOrders: 0, discount: 10 },
  silver: { label: "فضي", color: "#C0C0C0", minOrders: 20, discount: 15 },
  gold: { label: "ذهبي", color: "#C4956A", minOrders: 50, discount: 25 },
  platinum: { label: "بلاتيني", color: "#E5E4E2", minOrders: 100, discount: 35 },
};

// Order status config
export const orderStatusConfig = {
  pending: { label: "في الانتظار", color: "bg-amber-100 text-amber-800", icon: "Clock" },
  confirmed: { label: "مؤكد", color: "bg-blue-100 text-blue-800", icon: "CheckCircle" },
  manufacturing: { label: "قيد التصنيع", color: "bg-purple-100 text-purple-800", icon: "Factory" },
  shipped: { label: "تم الشحن", color: "bg-cyan-100 text-cyan-800", icon: "Truck" },
  delivered: { label: "تم التسليم", color: "bg-green-100 text-green-800", icon: "PackageCheck" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-800", icon: "XCircle" },
};

export const paymentStatusConfig = {
  unpaid: { label: "غير مدفوع", color: "bg-red-100 text-red-700" },
  partial: { label: "مدفوع جزئياً", color: "bg-amber-100 text-amber-700" },
  paid: { label: "مدفوع", color: "bg-green-100 text-green-700" },
};
