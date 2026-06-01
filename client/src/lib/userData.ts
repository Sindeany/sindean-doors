// ============================================================
// User Data - Sindian Doors
// Mock data for retail customer accounts, orders, and wishlist
// ============================================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
  addresses: Address[];
}

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building: string;
  isDefault: boolean;
}

export interface OrderItem {
  productId: number;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  wood: string;
  finish: string;
}

export interface CustomerOrder {
  id: string;
  date: string;
  status: "pending" | "confirmed" | "manufacturing" | "quality_check" | "shipping" | "delivered" | "cancelled";
  items: OrderItem[];
  subtotal: number;
  vat: number;
  shipping: number;
  total: number;
  address: string;
  paymentMethod: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  status: string;
  label: string;
  date: string;
  time: string;
  completed: boolean;
  active: boolean;
  description?: string;
}

// ── Status labels ─────────────────────────────────────────────────────────────
export const orderStatusLabels: Record<CustomerOrder["status"], string> = {
  pending: "في الانتظار",
  confirmed: "مؤكد",
  manufacturing: "قيد التصنيع",
  quality_check: "فحص الجودة",
  shipping: "في الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const orderStatusColors: Record<CustomerOrder["status"], string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  manufacturing: "bg-purple-100 text-purple-700",
  quality_check: "bg-orange-100 text-orange-700",
  shipping: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ── Mock user ─────────────────────────────────────────────────────────────────
export const mockUser: UserProfile = {
  id: "USR-001",
  name: "عبدالرحمن الشمري",
  email: "abdulrahman@example.sa",
  phone: "0501234567",
  avatar: "",
  joinDate: "مارس ٢٠٢٤",
  totalOrders: 4,
  totalSpent: 18750,
  loyaltyPoints: 1875,
  addresses: [
    {
      id: "addr-1",
      label: "المنزل",
      name: "عبدالرحمن الشمري",
      phone: "0501234567",
      city: "الرياض",
      district: "حي العليا",
      street: "شارع العروبة",
      building: "فيلا ٢٣",
      isDefault: true,
    },
    {
      id: "addr-2",
      label: "العمل",
      name: "عبدالرحمن الشمري",
      phone: "0501234567",
      city: "الرياض",
      district: "حي المروج",
      street: "طريق الملك فهد",
      building: "برج الأعمال، الدور ٥",
      isDefault: false,
    },
  ],
};

// ── Mock orders ───────────────────────────────────────────────────────────────
export const mockOrders: CustomerOrder[] = [
  {
    id: "ORD-2025-0041",
    date: "١٢ أبريل ٢٠٢٥",
    status: "shipping",
    items: [
      {
        productId: 1,
        name: "باب كلاسيكي من خشب السنديان",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80",
        quantity: 3,
        unitPrice: 1160,
        totalPrice: 3480,
        wood: "خشب السنديان",
        finish: "بني داكن",
      },
      {
        productId: 5,
        name: "مجموعة مقابض نحاسية فاخرة",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80",
        quantity: 3,
        unitPrice: 185,
        totalPrice: 555,
        wood: "-",
        finish: "نحاسي مصقول",
      },
    ],
    subtotal: 4035,
    vat: 605.25,
    shipping: 0,
    total: 4640.25,
    address: "فيلا ٢٣، شارع العروبة، حي العليا، الرياض",
    paymentMethod: "بطاقة مدى",
    trackingNumber: "SND-TRK-2025-0041",
    estimatedDelivery: "١٨ أبريل ٢٠٢٥",
    timeline: [
      { status: "confirmed", label: "تأكيد الطلب", date: "١٢ أبريل", time: "١٠:٣٠ ص", completed: true, active: false, description: "تم استلام طلبك وتأكيده بنجاح" },
      { status: "manufacturing", label: "بدء التصنيع", date: "١٣ أبريل", time: "٨:٠٠ ص", completed: true, active: false, description: "بدأ فريق التصنيع العمل على طلبك" },
      { status: "quality_check", label: "فحص الجودة", date: "١٥ أبريل", time: "٢:٠٠ م", completed: true, active: false, description: "اجتاز طلبك فحص الجودة بتقييم ممتاز" },
      { status: "shipping", label: "في الشحن", date: "١٦ أبريل", time: "٩:٠٠ ص", completed: false, active: true, description: "طلبك في الطريق إليك مع شركة أرامكس" },
      { status: "delivered", label: "تم التسليم", date: "١٨ أبريل", time: "-", completed: false, active: false, description: "سيتم التسليم خلال ٢-٣ أيام عمل" },
    ],
  },
  {
    id: "ORD-2025-0028",
    date: "٢٢ مارس ٢٠٢٥",
    status: "delivered",
    items: [
      {
        productId: 2,
        name: "باب عصري من خشب الجوز الأمريكي",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&q=80",
        quantity: 5,
        unitPrice: 1380,
        totalPrice: 6900,
        wood: "خشب الجوز الأمريكي",
        finish: "رمادي فاتح",
      },
    ],
    subtotal: 6900,
    vat: 1035,
    shipping: 0,
    total: 7935,
    address: "فيلا ٢٣، شارع العروبة، حي العليا، الرياض",
    paymentMethod: "تحويل بنكي",
    trackingNumber: "SND-TRK-2025-0028",
    timeline: [
      { status: "confirmed", label: "تأكيد الطلب", date: "٢٢ مارس", time: "٩:١٥ ص", completed: true, active: false },
      { status: "manufacturing", label: "بدء التصنيع", date: "٢٣ مارس", time: "٨:٠٠ ص", completed: true, active: false },
      { status: "quality_check", label: "فحص الجودة", date: "٢٦ مارس", time: "١١:٠٠ ص", completed: true, active: false },
      { status: "shipping", label: "في الشحن", date: "٢٧ مارس", time: "٨:٣٠ ص", completed: true, active: false },
      { status: "delivered", label: "تم التسليم", date: "٢٩ مارس", time: "٢:٤٥ م", completed: true, active: false, description: "تم التسليم بنجاح" },
    ],
  },
  {
    id: "ORD-2025-0015",
    date: "٥ فبراير ٢٠٢٥",
    status: "delivered",
    items: [
      {
        productId: 3,
        name: "باب مقاوم للحريق - درجة FD60",
        image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&q=80",
        quantity: 2,
        unitPrice: 2100,
        totalPrice: 4200,
        wood: "خشب مقاوم للحريق",
        finish: "أبيض ناصع",
      },
    ],
    subtotal: 4200,
    vat: 630,
    shipping: 150,
    total: 4980,
    address: "برج الأعمال، الدور ٥، حي المروج، الرياض",
    paymentMethod: "بطاقة فيزا",
    trackingNumber: "SND-TRK-2025-0015",
    timeline: [
      { status: "confirmed", label: "تأكيد الطلب", date: "٥ فبراير", time: "٣:٢٠ م", completed: true, active: false },
      { status: "manufacturing", label: "بدء التصنيع", date: "٦ فبراير", time: "٨:٠٠ ص", completed: true, active: false },
      { status: "quality_check", label: "فحص الجودة", date: "١٠ فبراير", time: "١:٠٠ م", completed: true, active: false },
      { status: "shipping", label: "في الشحن", date: "١١ فبراير", time: "٧:٤٥ ص", completed: true, active: false },
      { status: "delivered", label: "تم التسليم", date: "١٣ فبراير", time: "١١:٣٠ ص", completed: true, active: false },
    ],
  },
  {
    id: "ORD-2024-0087",
    date: "١٨ نوفمبر ٢٠٢٤",
    status: "delivered",
    items: [
      {
        productId: 4,
        name: "باب عازل للصوت - درجة STC45",
        image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=200&q=80",
        quantity: 1,
        unitPrice: 1800,
        totalPrice: 1800,
        wood: "خشب الزان المركّب",
        finish: "خشبي طبيعي",
      },
    ],
    subtotal: 1800,
    vat: 270,
    shipping: 0,
    total: 2070,
    address: "فيلا ٢٣، شارع العروبة، حي العليا، الرياض",
    paymentMethod: "بطاقة مدى",
    trackingNumber: "SND-TRK-2024-0087",
    timeline: [
      { status: "confirmed", label: "تأكيد الطلب", date: "١٨ نوفمبر", time: "٦:٠٠ م", completed: true, active: false },
      { status: "manufacturing", label: "بدء التصنيع", date: "١٩ نوفمبر", time: "٨:٠٠ ص", completed: true, active: false },
      { status: "quality_check", label: "فحص الجودة", date: "٢٢ نوفمبر", time: "١٠:٠٠ ص", completed: true, active: false },
      { status: "shipping", label: "في الشحن", date: "٢٣ نوفمبر", time: "٩:١٥ ص", completed: true, active: false },
      { status: "delivered", label: "تم التسليم", date: "٢٥ نوفمبر", time: "٤:٣٠ م", completed: true, active: false },
    ],
  },
];

// ── Mock wishlist product IDs ──────────────────────────────────────────────────
export const mockWishlistIds: number[] = [1, 3, 6, 9];
