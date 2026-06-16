# مهام إضافة خاصية حذف الموزعين والطلبات (Admin: Delete Distributors & Orders Tasks)

- [ ] تعديل الخادم (tRPC backend):
  - [ ] إضافة طفرة الحذف `delete` لطلبات الموزعين في `productOptions.router.ts`
- [ ] تعديل الواجهة الأمامية للوحة الأدمن (Frontend UI):
  - [ ] تفعيل زر الحذف للموزعين في `AdminDistributors.tsx` وربطه بالـ `deleteMutation`
  - [ ] تفعيل زر الحذف لطلبات الموزعين في `AdminDistributorOrders.tsx` وربطه بالخادم
- [ ] التحقق والتشغيل:
  - [ ] تشغيل فحص سلامة الأكواد `pnpm run check`
  - [ ] تشغيل البناء المحلي للتأكد من نجاح التجميع `pnpm run build:local`
- [ ] النشر والرفع:
  - [ ] عمل commit و push للتعديلات ومزامنتها على GitHub

