// ============================================================
// Admin Login Page - Sindian Doors
// Simple, secure admin authentication
// ============================================================
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { trpc } from "@/lib/trpc";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { login, isAdminLoggedIn } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAdminLoggedIn) navigate("/admin");
  }, [isAdminLoggedIn, navigate]);

  const loginMutation = trpc.adminAuth.login.useMutation({
    onSuccess: () => {
      login();
      toast.success("مرحباً بك في لوحة الإدارة");
    },
    onError: err => {
      toast.error(err.message || "كلمة المرور غير صحيحة");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }
    loginMutation.mutate({ password });
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">لوحة الإدارة</h1>
          <p className="text-stone-400 text-sm mt-1">سنديان للأبواب الخشبية</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="password" className="text-stone-300">
              كلمة المرور
            </Label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10 pl-10 bg-stone-800 border-stone-700 text-white placeholder:text-stone-500 text-right"
                placeholder="أدخل كلمة مرور الإدارة"
                dir="ltr"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
          >
            {loginMutation.isPending ? "جاري التحقق..." : "دخول"}
          </Button>
        </form>
      </div>
    </div>
  );
}
