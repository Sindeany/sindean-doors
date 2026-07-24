// ============================================================
// User Auth Context - Sindian Doors
// Real authentication via tRPC users router
// ============================================================

import {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface SafeUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  wishlistIds: number[];
  createdAt: number;
  // حقول اختيارية (تُحسب مستقبلاً)
  totalOrders?: number;
  totalSpent?: number;
  loyaltyPoints?: number;
  joinDate?: string;
}

interface UserAuthContextType {
  user: SafeUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  wishlistIds: number[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<boolean>;
  logout: () => void;
  toggleWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
}

const UserAuthContext = createContext<UserAuthContextType | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();

  const loginMutation = trpc.users.login.useMutation();
  const registerMutation = trpc.users.register.useMutation();
  const toggleWishlistMutation = trpc.users.toggleWishlist.useMutation();
  const logoutMutation = trpc.users.logout.useMutation({
    onSettled: () => utils.users.me.reset(),
  });

  // استعادة الجلسة عند تحميل الصفحة عبر httpOnly cookie
  const meQuery = trpc.users.me.useQuery(undefined, {
    retry: false,
  });

  const user = (meQuery.data as SafeUser) ?? null;
  const isLoading = meQuery.isLoading;

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      utils.users.me.invalidate();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "خطأ في تسجيل الدخول");
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<boolean> => {
    try {
      const result = await registerMutation.mutateAsync({
        name,
        email,
        phone,
        password,
      });
      utils.users.me.invalidate();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "خطأ في إنشاء الحساب");
      return false;
    }
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  const wishlistIds = user?.wishlistIds ?? [];

  const toggleWishlist = async (productId: number) => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً لإضافة المنتجات للمفضلة");
      return;
    }
    try {
      const result = await toggleWishlistMutation.mutateAsync({ productId });
      await utils.users.me.invalidate();
      const added = result.wishlistIds.includes(productId);
      toast.success(
        added ? "تمت إضافة المنتج إلى المفضلة" : "تمت إزالة المنتج من المفضلة"
      );
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مرة أخرى");
    }
  };

  const isInWishlist = (productId: number) => wishlistIds.includes(productId);

  return (
    <UserAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        wishlistIds,
        login,
        register,
        logout,
        toggleWishlist,
        isInWishlist,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used inside UserAuthProvider");
  return ctx;
}
