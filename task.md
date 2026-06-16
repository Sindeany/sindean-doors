- `[x]` Update `ConfiguredItem` interface and item initialization in `NewOrderWizard.tsx`
- `[x]` Implement dynamic options rendering block in Step 1 of `NewOrderWizard.tsx` (all active sections/groups)
- `[x]` Integrate `DoorDiagram` SVG inside Step 1 dimensions rendering
- `[x]` Implement dynamic price calculations (base + options adjustments) applying distributor's discount rate
- `[x]` Update `AdminDistributorOrders.tsx` to display selected product options in the expanded order details
- `[x]` Run compilation check `pnpm check` and verify the build

# مهام تحديث الطلبات وثبات الجلسة للموزعين (Distributor Order Sync & Auth Persistence Tasks)

- [x] إضافة حدث النجاح `onSuccess` وتحديث قائمة طلبات الموزع:
  - [x] تحديث `NewOrderWizard.tsx` لإضافة واستدعاء `onSuccess`
  - [x] تحديث `DistributorOrders.tsx` لتمرير `onSuccess` وإبطال الكاش
- [x] إضافة حواجز التحميل (Loading Guards) لثبات الجلسة عند التحديث:
  - [x] تحديث `DistributorDashboard.tsx`
  - [x] تحديث `DistributorOrders.tsx`
  - [x] تحديث `DistributorAccount.tsx`
  - [x] تحديث `DistributorProducts.tsx`
  - [x] تحديث `DistributorReports.tsx`
  - [x] تحديث `DistributorComplaints.tsx`
  - [x] تحديث `DistributorCatalogue.tsx`
  - [x] تحديث `DistributorPayments.tsx`
- [x] التحقق وتشغيل البناء (`pnpm run check` و `pnpm run build:local`) and verify the build
