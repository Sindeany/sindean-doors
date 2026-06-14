import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "./contexts/LanguageContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DistributorAuthProvider } from "./contexts/DistributorAuthContext";
import { CompanyAuthProvider } from "./contexts/CompanyAuthContext";
import { UserAuthProvider } from "./contexts/UserAuthContext";
import { SupplierAuthProvider } from "./contexts/SupplierAuthContext";
import { CartProvider } from "./contexts/CartContext";
import CartDrawer from "./components/CartDrawer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import B2B from "./pages/B2B";
import Projects from "./pages/Projects";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CartPage from "./pages/Cart";
import CheckoutPage from "./pages/Checkout";

// Distributor portal
import DistributorLogin from "./pages/distributor/DistributorLogin";
import DistributorDashboard from "./pages/distributor/DistributorDashboard";
import DistributorOrders from "./pages/distributor/DistributorOrders";
import DistributorPayments from "./pages/distributor/DistributorPayments";
import DistributorReports from "./pages/distributor/DistributorReports";
import DistributorProducts from "./pages/distributor/DistributorProducts";
import DistributorAccount from "./pages/distributor/DistributorAccount";
import DistributorCatalogue from "./pages/distributor/DistributorCatalogue";
import DistributorComplaints from "./pages/distributor/DistributorComplaints";
import DistributorSettings from "./pages/distributor/DistributorSettings";

// Admin Panel
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDistributors from "./pages/admin/AdminDistributors";
import AdminDistributorOrders from "./pages/admin/AdminDistributorOrders";
import AdminOrders from "./pages/admin/AdminOrdersDB";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminDistributorProfile from "./pages/admin/AdminDistributorProfile";
import AdminEfficiency from "./pages/admin/AdminEfficiency";
import AdminDecisionLog from "./pages/admin/AdminDecisionLog";
import AdminDailySummary from "./pages/admin/AdminDailySummary";
import AdminWorkflow from "./pages/admin/AdminWorkflow";
import AdminJobOrderDetail from "./pages/admin/AdminJobOrderDetail";
import AdminQCInspection from "./pages/admin/AdminQCInspection";
import AdminPackingDelivery from "./pages/admin/AdminPackingDelivery";
import AdminPostOrderReview from "./pages/admin/AdminPostOrderReview";
import AdminWorkOrders from "./pages/admin/AdminWorkOrders";
import AdminProductionPlanning from "./pages/admin/AdminProductionPlanning";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminStocktaking from "./pages/admin/AdminStocktaking";
import AdminProductOptions from "./pages/admin/AdminProductOptions";
import AdminSuppliers from "./pages/admin/AdminSuppliers";
import AdminRFQ from "./pages/admin/AdminRFQ";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminZATCAInvoices from "./pages/admin/AdminZATCAInvoices";
import AdminAccounting from "./pages/admin/AdminAccounting";
import AdminPurchases from "./pages/admin/AdminPurchases";
import AdminBIDashboard from "./pages/admin/AdminBIDashboard";
import CustomerPortal from "./pages/customer/CustomerPortal";

// Supplier portal
import SupplierLogin from "./pages/supplier/SupplierLogin";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";

// Company B2B portal
import CompanyLogin from "./pages/company/CompanyLogin";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import { CompanyRFQList, CompanyRFQDetail } from "./pages/company/CompanyRFQ";
import {
  CompanyOrdersList,
  CompanyOrderDetail,
} from "./pages/company/CompanyOrders";
import CompanyAccount from "./pages/company/CompanyAccount";

import AdminLogin from "./pages/admin/AdminLogin";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";

// User account portal
import UserLogin from "./pages/user/UserLogin";
import UserDashboard from "./pages/user/UserDashboard";
import UserOrders from "./pages/user/UserOrders";
import UserWishlist from "./pages/user/UserWishlist";

function Router() {
  return (
    <>
      <CartDrawer />
      <Switch>
        {/* Public pages */}
        <Route path={"/"} component={Home} />
        <Route path={"/products"} component={Products} />
        <Route path={"/product/:id"} component={ProductDetail} />
        <Route path={"/b2b"} component={B2B} />
        <Route path={"/projects"} component={Projects} />
        <Route path={"/about"} component={About} />
        <Route path={"/contact"} component={Contact} />
        <Route path={"/cart"} component={CartPage} />
        <Route path={"/checkout"} component={CheckoutPage} />

        {/* User account portal */}
        <Route path={"/login"} component={UserLogin} />
        <Route path={"/account"} component={UserDashboard} />
        <Route path={"/account/orders"} component={UserOrders} />
        <Route path={"/account/orders/:id"} component={UserOrders} />
        <Route path={"/account/wishlist"} component={UserWishlist} />
        <Route path={"/my-portal"} component={CustomerPortal} />

        {/* Distributor portal */}
        <Route path={"/distributor"} component={DistributorLogin} />
        <Route
          path={"/distributor/dashboard"}
          component={DistributorDashboard}
        />
        <Route path={"/distributor/orders"} component={DistributorOrders} />
        <Route path={"/distributor/payments"} component={DistributorPayments} />
        <Route path={"/distributor/reports"} component={DistributorReports} />
        <Route path={"/distributor/products"} component={DistributorProducts} />
        <Route path={"/distributor/account"} component={DistributorAccount} />
        <Route
          path={"/distributor/catalogue"}
          component={DistributorCatalogue}
        />
        <Route
          path={"/distributor/complaints"}
          component={DistributorComplaints}
        />
        <Route
          path={"/distributor/settings"}
          component={DistributorSettings}
        />

        {/* Admin Panel */}
        <Route path={"/admin/login"} component={AdminLogin} />
        <Route path={"/admin"} component={AdminDashboard} />
        <Route path={"/admin/dashboard"} component={AdminDashboard} />
        <Route path={"/admin/distributors"} component={AdminDistributors} />
        <Route path={"/admin/distributor-orders"} component={AdminDistributorOrders} />
        <Route path={"/admin/orders"} component={AdminOrders} />
        <Route path={"/admin/orders-db"} component={AdminOrders} />
        <Route path={"/admin/complaints"} component={AdminComplaints} />
        <Route path={"/admin/products"} component={AdminProducts} />
        <Route path={"/admin/reports"} component={AdminReports} />
        <Route path={"/admin/settings"} component={AdminSettings} />
        <Route path={"/admin/products/new"} component={AdminProductForm} />
        <Route path={"/admin/products/edit/:id"} component={AdminProductForm} />
        <Route
          path={"/admin/distributors/:id"}
          component={AdminDistributorProfile}
        />
        <Route path={"/admin/efficiency"} component={AdminEfficiency} />
        <Route path={"/admin/decision-log"} component={AdminDecisionLog} />
        <Route path={"/admin/daily-summary"} component={AdminDailySummary} />
        <Route path={"/admin/workflow"} component={AdminWorkflow} />
        <Route
          path={"/admin/workflow/:id/job-order"}
          component={AdminJobOrderDetail}
        />
        <Route path={"/admin/qc"} component={AdminQCInspection} />
        <Route path={"/admin/packing"} component={AdminPackingDelivery} />
        <Route path={"/admin/post-review"} component={AdminPostOrderReview} />
        <Route path={"/admin/work-orders"} component={AdminWorkOrders} />
        <Route path={"/admin/production"} component={AdminProductionPlanning} />
        <Route path={"/admin/bi"} component={AdminBIDashboard} />
        <Route path={"/admin/inventory"} component={AdminInventory} />
        <Route path={"/admin/stocktaking"} component={AdminStocktaking} />
        <Route
          path={"/admin/product-options"}
          component={AdminProductOptions}
        />
        <Route path={"/admin/suppliers"} component={AdminSuppliers} />
        <Route path={"/admin/rfq"} component={AdminRFQ} />
        <Route path={"/admin/invoices"} component={AdminInvoices} />
        <Route path={"/admin/zatca-invoices"} component={AdminZATCAInvoices} />
        <Route path={"/admin/accounting"} component={AdminAccounting} />
        <Route path={"/admin/purchases"} component={AdminPurchases} />

        {/* Supplier portal */}
        <Route path={"/supplier/login"} component={SupplierLogin} />
        <Route path={"/supplier/dashboard"} component={SupplierDashboard} />

        {/* Company B2B portal */}
        <Route path={"/company"} component={CompanyLogin} />
        <Route path={"/company/dashboard"} component={CompanyDashboard} />
        <Route path={"/company/rfq"} component={CompanyRFQList} />
        <Route path={"/company/rfq/:id"} component={CompanyRFQDetail} />
        <Route path={"/company/orders"} component={CompanyOrdersList} />
        <Route path={"/company/orders/:id"} component={CompanyOrderDetail} />
        <Route path={"/company/account"} component={CompanyAccount} />

        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider defaultTheme="light">
          <UserAuthProvider>
            <CartProvider>
              <DistributorAuthProvider>
                <CompanyAuthProvider>
                  <SupplierAuthProvider>
                    <AdminAuthProvider>
                      <TooltipProvider>
                        <Toaster position="top-center" />
                        <Router />
                      </TooltipProvider>
                    </AdminAuthProvider>
                  </SupplierAuthProvider>
                </CompanyAuthProvider>
              </DistributorAuthProvider>
            </CartProvider>
          </UserAuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
