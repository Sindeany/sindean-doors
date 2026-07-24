/**
 * CartContext - سياق سلة المشتريات
 * Design: Architectural Luxury — Oak Green #2C4A3E, Copper #C4956A, Warm Beige #E8DFD0
 *
 * Core Logic:
 * - Tiered pricing: price auto-recalculates based on total quantity per product
 * - selectedOptions stored per cart item (color, size, handle, finish, hinge, glass)
 * - VAT 15% applied at checkout
 * - Persisted to localStorage for session continuity
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Product, PriceTier } from "@/lib/productsData";

// ── Selected options map: optionId → valueId ─────────────────
export type SelectedOptions = Record<string, string>;

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;          // السعر الفعلي المطبق بعد التدرج + الإضافات
  basePrice: number;          // السعر الأساسي (أول شريحة)
  activeTierLabel: string;    // وصف الشريحة النشطة
  savings: number;            // المبلغ الموفر مقارنة بالسعر الأساسي
  selectedOptions: SelectedOptions; // الخيارات المختارة
  optionsPriceAdj: number;    // إجمالي تعديل السعر من الخيارات
  cartItemKey: string;        // مفتاح فريد = productId + options hash
}

export interface CartSummary {
  subtotal: number;
  vat: number;
  vatRate: number;
  total: number;
  totalItems: number;
  totalQuantity: number;
  totalSavings: number;
}

interface CartContextType {
  items: CartItem[];
  summary: CartSummary;
  addToCart: (product: Product, quantity?: number, options?: SelectedOptions) => void;
  removeFromCart: (cartItemKey: string) => void;
  updateQuantity: (cartItemKey: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** حساب سعر الوحدة بناءً على الكمية والشرائح السعرية */
export function getUnitPrice(tiers: PriceTier[], quantity: number): { price: number; label: string } {
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  for (const tier of sorted) {
    if (quantity >= tier.min) {
      return { price: tier.price, label: tier.label };
    }
  }
  const defaultTier = [...tiers].sort((a, b) => a.min - b.min)[0];
  return { price: defaultTier.price, label: defaultTier.label };
}

/** حساب تعديل السعر من الخيارات المختارة */
function calcOptionsPriceAdj(product: Product, options: SelectedOptions): number {
  if (!product.options) return 0;
  return Object.entries(options).reduce((sum, [optId, valId]) => {
    const opt = product.options?.find((o) => o.id === optId);
    const val = opt?.values.find((v) => v.id === valId);
    return sum + (val?.priceAdj ?? 0);
  }, 0);
}

/** إنشاء مفتاح فريد للعنصر في السلة */
function makeCartItemKey(productId: string, options: SelectedOptions): string {
  const optStr = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return `${productId}__${optStr}`;
}

/** بناء CartItem من منتج وكمية وخيارات */
function buildCartItem(product: Product, quantity: number, options: SelectedOptions = {}): CartItem {
  const basePrice = product.tiers.sort((a, b) => a.min - b.min)[0].price;
  const { price: tierPrice, label: activeTierLabel } = getUnitPrice(product.tiers, quantity);
  const optionsPriceAdj = calcOptionsPriceAdj(product, options);
  const unitPrice = tierPrice + optionsPriceAdj;
  const savings = Math.max(0, (basePrice - tierPrice) * quantity);
  const cartItemKey = makeCartItemKey(product.id, options);

  return {
    product,
    quantity,
    unitPrice,
    basePrice,
    activeTierLabel,
    savings,
    selectedOptions: options,
    optionsPriceAdj,
    cartItemKey,
  };
}

/** حساب ملخص السلة */
function calcSummary(items: CartItem[]): CartSummary {
  const vatRate = 0.15;
  // الأسعار شاملة الضريبة: الإجمالي = مجموع الأسعار كما هي
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalSavings = items.reduce((sum, item) => sum + item.savings, 0);
  // استخراج الصافي والضريبة من داخل الإجمالي الشامل
  const subtotal = Math.round((total / (1 + vatRate)) * 100) / 100;
  const vat = Math.round((total - subtotal) * 100) / 100;
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, vat, vatRate, total, totalItems, totalQuantity, totalSavings };
}

const STORAGE_KEY = "sindian_cart_v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        return parsed.map((item) => buildCartItem(item.product, item.quantity, item.selectedOptions ?? {}));
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const summary = calcSummary(items);

  const addToCart = useCallback((product: Product, quantity: number = 1, options: SelectedOptions = {}) => {
    const key = makeCartItemKey(product.id, options);
    setItems((prev) => {
      const existing = prev.find((i) => i.cartItemKey === key);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map((i) =>
          i.cartItemKey === key ? buildCartItem(product, newQty, options) : i
        );
      }
      return [...prev, buildCartItem(product, quantity, options)];
    });
  }, []);

  const removeFromCart = useCallback((cartItemKey: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemKey !== cartItemKey));
  }, []);

  const updateQuantity = useCallback((cartItemKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.cartItemKey !== cartItemKey));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.cartItemKey === cartItemKey
          ? buildCartItem(i.product, quantity, i.selectedOptions)
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (productId: string) => items.some((i) => i.product.id === productId),
    [items]
  );

  const getItemQuantity = useCallback(
    (productId: string) =>
      items.filter((i) => i.product.id === productId).reduce((s, i) => s + i.quantity, 0),
    [items]
  );

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isInCart,
        getItemQuantity,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
