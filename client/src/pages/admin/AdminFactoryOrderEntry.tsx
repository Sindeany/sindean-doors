/**
 * Staff factory order entry. Submits only through orders.create.
 * Customer text is typed by hand: the create contract has no customer id.
 */
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import StaffIdentityControl from "@/components/admin/StaffIdentityControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { STAFF_IDENTITY_OPEN_EVENT } from "@/lib/staffIdentity";
import { staffRoleLabelAr } from "@/lib/staffRoles";
import {
  applyCatalogProduct,
  emptyFactoryOrderForm,
  factoryOrderPageAccess,
  factoryOrderSuccessView,
  selectedChoiceIds,
  setDimensionValue,
  setSingleSelection,
  setSubSelection,
  setTextSelection,
  staffOptionSectionsFromCatalog,
  suggestedLineTotal,
  toggleMultiSelection,
  validateFactoryOrderForm,
  type FactoryOrderErrorCode,
  type FactoryOrderFieldError,
  type FactoryOrderFormInput,
  type FactoryOrderSuccessView,
  type StaffOptionField,
  type StaffOptionSub,
} from "@/lib/staffFactoryOrder";
import { trpc } from "@/lib/trpc";

const COPY = {
  ar: {
    title: "طلب مصنع جديد",
    subtitle: "ينشئ مسودة فقط. لا يُرسل للمراجعة ولا يُعتمد من هذه الصفحة.",
    loading: "جاري التحقق من هوية الموظف...",
    identityTitle: "يلزم تسجيل هوية الموظف",
    identityBody:
      "هذه الصفحة تقرأ جلسة الموظف فقط. جلسة المدير أو حساب العميل لا يفتحانها.",
    identityAction: "فتح لوحة هوية الموظف",
    forbiddenTitle: "لا يمكن إنشاء طلب مصنع بهذا الدور",
    forbiddenBody:
      "الصفحة متاحة لمندوب المبيعات أو منسق المبيعات. أي دور آخر لا يكفي وحده.",
    yourRoles: "أدوار هذه الجلسة",
    customerMode:
      "إدخال عميل يدوي. لا يوجد اختيار من سجل عملاء، والعقد الحالي لا يقبل معرّف عميل.",
    customer: "العميل",
    name: "اسم العميل",
    phone: "الجوال",
    email: "البريد (اختياري)",
    product: "المنتج",
    chooseProduct: "اختر منتجاً من الكتالوج",
    productsLoading: "جاري تحميل المنتجات...",
    productsEmpty: "لا توجد منتجات نشطة في الكتالوج.",
    productsError: "تعذر تحميل الكتالوج.",
    catalogPrice: "سعر الكتالوج",
    sar: "ر.س",
    doors: "عدد الأبواب",
    basePrice: "السعر الأساسي",
    totalPrice: "الإجمالي",
    priceHint: "ريال سعودي صحيح، كما تُخزَّن حقول السعر الحالية. بلا تحويل إلى هللة.",
    useLineTotal: "وضع الإجمالي = السعر × العدد",
    options: "الخيارات",
    optionsLoading: "جاري تحميل خيارات المنتج...",
    optionsError: "تعذر تحميل الخيارات. يمكن حفظ المسودة بدونها.",
    optionsEmpty: "لا توجد خيارات مفعّلة. تُرسل الاختيارات فارغة.",
    none: "بدون",
    fileHint: "مرجع نصي فقط. لا يُرفع ملف من هذه الصفحة.",
    notes: "ملاحظات",
    submit: "إنشاء مسودة",
    submitting: "جارٍ إنشاء المسودة...",
    created: "تم إنشاء مسودة طلب المصنع",
    internalRef: "مرجع داخلي",
    status: "الحالة التجارية",
    another: "إنشاء طلب آخر",
    customer_name: "اسم العميل مطلوب",
    customer_phone: "رقم الجوال مطلوب",
    customer_email: "البريد غير صالح",
    product_error: "اختر منتجاً",
    total_doors: "أدخل عدداً صحيحاً أكبر من صفر",
    base_price: "أدخل السعر الأساسي كعدد صحيح بالريال",
    total_price: "أدخل الإجمالي كعدد صحيح بالريال",
    dimension: "أدخل قياساً رقمياً",
  },
  en: {
    title: "New factory order",
    subtitle: "Creates a draft only. This page does not submit it for review.",
    loading: "Checking staff identity...",
    identityTitle: "Staff identity is required",
    identityBody: "This page reads the staff session only. An admin or customer session does not open it.",
    identityAction: "Open staff identity",
    forbiddenTitle: "This role cannot create a factory order",
    forbiddenBody: "Only a sales person or sales coordinator can use this page.",
    yourRoles: "Roles on this session",
    customerMode:
      "Manual customer entry. There is no customer directory, and the create contract has no customer id.",
    customer: "Customer",
    name: "Customer name",
    phone: "Phone",
    email: "Email (optional)",
    product: "Product",
    chooseProduct: "Choose a catalog product",
    productsLoading: "Loading products...",
    productsEmpty: "No active catalog products.",
    productsError: "The catalog could not be loaded.",
    catalogPrice: "Catalog price",
    sar: "SAR",
    doors: "Door count",
    basePrice: "Base price",
    totalPrice: "Total",
    priceHint: "Whole Saudi riyals, matching the current price columns. No minor-unit conversion.",
    useLineTotal: "Set total = price × count",
    options: "Options",
    optionsLoading: "Loading product options...",
    optionsError: "Options could not be loaded. A draft can still be saved without them.",
    optionsEmpty: "No enabled options. Selections will be empty.",
    none: "None",
    fileHint: "Text reference only. This page does not upload a file.",
    notes: "Notes",
    submit: "Create draft",
    submitting: "Creating draft...",
    created: "Factory order draft created",
    internalRef: "Internal ref",
    status: "Commercial status",
    another: "Create another",
    customer_name: "Customer name is required",
    customer_phone: "Phone is required",
    customer_email: "Email is not valid",
    product_error: "Choose a product",
    total_doors: "Enter a whole number greater than zero",
    base_price: "Enter the base price as whole riyals",
    total_price: "Enter the total as whole riyals",
    dimension: "Enter a numeric measurement",
  },
  zh: {
    title: "新建工厂订单",
    subtitle: "只创建草稿。此页面不会送审，也不会批准。",
    loading: "正在核对员工身份...",
    identityTitle: "需要员工身份",
    identityBody: "此页面只读取员工会话。管理员会话或客户会话不能打开它。",
    identityAction: "打开员工身份",
    forbiddenTitle: "当前角色不能创建工厂订单",
    forbiddenBody: "只有销售人员或销售协调员可以使用此页面。",
    yourRoles: "当前会话角色",
    customerMode: "手工填写客户。没有客户名录，创建接口也不接收客户编号。",
    customer: "客户",
    name: "客户姓名",
    phone: "电话",
    email: "邮箱（可选）",
    product: "产品",
    chooseProduct: "从目录选择产品",
    productsLoading: "正在加载产品...",
    productsEmpty: "目录中没有在售产品。",
    productsError: "无法加载目录。",
    catalogPrice: "目录价格",
    sar: "SAR",
    doors: "门数量",
    basePrice: "基础价格",
    totalPrice: "合计",
    priceHint: "整数沙特里亚尔，沿用当前价格字段，不换算为最小货币单位。",
    useLineTotal: "合计 = 价格 × 数量",
    options: "选项",
    optionsLoading: "正在加载产品选项...",
    optionsError: "选项未能加载。仍可在没有选项时保存草稿。",
    optionsEmpty: "没有启用的选项。选择将为空。",
    none: "无",
    fileHint: "只保存文字说明。此页面不上传文件。",
    notes: "备注",
    submit: "创建草稿",
    submitting: "正在创建草稿...",
    created: "已创建工厂订单草稿",
    internalRef: "内部编号",
    status: "商务状态",
    another: "再创建一单",
    customer_name: "客户姓名为必填",
    customer_phone: "电话为必填",
    customer_email: "邮箱无效",
    product_error: "请选择产品",
    total_doors: "请输入大于零的整数",
    base_price: "基础价格须为整数里亚尔",
    total_price: "合计须为整数里亚尔",
    dimension: "请输入数字尺寸",
  },
} as const;

type Copy = { [K in keyof (typeof COPY)["ar"]]: string };

function messageFor(copy: Copy, code: FactoryOrderErrorCode): string {
  switch (code) {
    case "customer_name":
      return copy.customer_name;
    case "customer_phone":
      return copy.customer_phone;
    case "customer_email":
      return copy.customer_email;
    case "product":
      return copy.product_error;
    case "total_doors":
      return copy.total_doors;
    case "base_price":
      return copy.base_price;
    case "total_price":
      return copy.total_price;
    case "dimension":
      return copy.dimension;
  }
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-gray-400 leading-5">{hint}</span> : null}
      {error ? <span className="block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

const selectClass =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export default function AdminFactoryOrderEntry() {
  const { lang, dir } = useLanguage();
  const copy = COPY[lang];
  const meQuery = trpc.staffAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const access = factoryOrderPageAccess({
    staff: meQuery.data,
    staffStatus: meQuery.isLoading ? "pending" : meQuery.isSuccess ? "success" : "error",
    legacyAdminSession: false,
    customerSession: false,
  });

  const productsQuery = trpc.products.list.useQuery(undefined, {
    enabled: access === "allowed",
    retry: false,
  });
  const optionsQuery = trpc.productOptions.get.useQuery(undefined, {
    enabled: access === "allowed",
    retry: false,
  });

  const [form, setForm] = useState<FactoryOrderFormInput>(emptyFactoryOrderForm);
  const [errors, setErrors] = useState<FactoryOrderFieldError[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<FactoryOrderSuccessView | null>(null);

  const sections = useMemo(
    () => staffOptionSectionsFromCatalog(optionsQuery.data),
    [optionsQuery.data]
  );
  const errorByField = useMemo(() => {
    const map = new Map<string, FactoryOrderErrorCode>();
    for (const error of errors) map.set(error.field, error.code);
    return map;
  }, [errors]);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (result) => {
      const view = factoryOrderSuccessView(result);
      setSuccess(view);
      setSubmitError(null);
      toast.success(`${copy.created} ${view.canonicalNumber}`);
    },
    onError: (error) => {
      setSubmitError(error.message);
      toast.error(error.message);
    },
  });

  const fieldError = (field: string) => {
    const code = errorByField.get(field);
    return code ? messageFor(copy, code) : undefined;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (access !== "allowed") return;
    const validated = validateFactoryOrderForm(form);
    if (!validated.ok) {
      setErrors(validated.errors);
      return;
    }
    setErrors([]);
    setSubmitError(null);
    createOrder.mutate(validated.payload);
  };

  const resetForAnother = () => {
    setSuccess(null);
    setForm(emptyFactoryOrderForm());
    setErrors([]);
    setSubmitError(null);
    createOrder.reset();
  };

  const lineTotal = suggestedLineTotal(form.basePrice, form.totalDoors);
  const selectedProduct = productsQuery.data?.find((product) => product.id === form.productId);

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FA" }} dir={dir}>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">{copy.title}</h1>
            <p className="text-sm text-gray-500 leading-6">{copy.subtitle}</p>
          </div>
          <StaffIdentityControl />
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {access === "loading" && <p className="text-sm text-gray-500">{copy.loading}</p>}

        {access === "needs_staff_identity" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 space-y-3" data-testid="factory-order-access">
            <h2 className="text-lg font-semibold text-gray-900">{copy.identityTitle}</h2>
            <p className="text-sm text-gray-600 leading-6">{copy.identityBody}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.dispatchEvent(new Event(STAFF_IDENTITY_OPEN_EVENT))}
            >
              {copy.identityAction}
            </Button>
          </div>
        )}

        {access === "forbidden" && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-6 space-y-2" data-testid="factory-order-access">
            <h2 className="text-lg font-semibold text-red-900">{copy.forbiddenTitle}</h2>
            <p className="text-sm text-red-800 leading-6">{copy.forbiddenBody}</p>
            {meQuery.data?.roles?.length ? (
              <p className="text-xs text-red-800">
                {copy.yourRoles}: {meQuery.data.roles.map((role) => staffRoleLabelAr(role)).join("، ")}
              </p>
            ) : null}
          </div>
        )}

        {access === "allowed" && success && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4" data-testid="factory-order-success">
            <p className="text-sm text-gray-600">{copy.created}</p>
            <p
              className="text-3xl font-semibold tracking-wide text-gray-900 break-all"
              dir="ltr"
              data-testid="factory-order-canonical-number"
            >
              {success.canonicalNumber}
            </p>
            <p className="text-sm text-gray-700">
              {copy.status}:{" "}
              <span
                className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-amber-900"
                data-testid="factory-order-commercial-status"
                data-status={success.commercialStatus}
              >
                {success.commercialStatusLabel}{" "}
                <span dir="ltr">({success.commercialStatus})</span>
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {success.reviewLabel}. {success.approvalLabel}.
            </p>
            <p className="text-xs text-gray-400" dir="ltr">
              {copy.internalRef} #{success.orderId}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={resetForAnother}>
                {copy.another}
              </Button>
            </div>
          </div>
        )}

        {access === "allowed" && !success && (
          <form className="space-y-4" onSubmit={onSubmit} noValidate data-testid="factory-order-form">
            <div
              className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-950 leading-6"
              data-customer-mode="manual"
            >
              {copy.customerMode}
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">{copy.customer}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label={copy.name} error={fieldError("customerName")}>
                  <Input
                    value={form.customerName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, customerName: event.target.value }))
                    }
                    maxLength={255}
                    autoComplete="name"
                  />
                </Field>
                <Field label={copy.phone} error={fieldError("customerPhone")}>
                  <Input
                    value={form.customerPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, customerPhone: event.target.value }))
                    }
                    maxLength={50}
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label={copy.email} error={fieldError("customerEmail")}>
                    <Input
                      value={form.customerEmail}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, customerEmail: event.target.value }))
                      }
                      maxLength={255}
                      dir="ltr"
                      inputMode="email"
                      autoComplete="email"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">{copy.product}</h2>
              <Field label={copy.product} error={fieldError("product")}>
                <select
                  className={selectClass}
                  value={form.productId}
                  onChange={(event) => {
                    const id = event.target.value;
                    if (!id) {
                      setForm((prev) => ({ ...prev, productId: "", productName: "" }));
                      return;
                    }
                    const product = productsQuery.data?.find((item) => item.id === id);
                    if (!product) return;
                    setForm((prev) => applyCatalogProduct(prev, product));
                  }}
                  disabled={productsQuery.isLoading}
                >
                  <option value="">{copy.chooseProduct}</option>
                  {(productsQuery.data ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </Field>
              {productsQuery.isLoading && (
                <p className="text-xs text-gray-500">{copy.productsLoading}</p>
              )}
              {productsQuery.isError && (
                <p className="text-xs text-red-700">{copy.productsError}</p>
              )}
              {productsQuery.isSuccess && productsQuery.data.length === 0 && (
                <p className="text-xs text-gray-500">{copy.productsEmpty}</p>
              )}
              {selectedProduct && (
                <p className="text-xs text-gray-500">
                  {copy.catalogPrice}: {selectedProduct.basePrice.toLocaleString()} {copy.sar}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label={copy.doors} error={fieldError("totalDoors")}>
                  <Input
                    value={form.totalDoors}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, totalDoors: event.target.value }))
                    }
                    inputMode="numeric"
                    dir="ltr"
                  />
                </Field>
                <Field label={copy.basePrice} hint={copy.priceHint} error={fieldError("basePrice")}>
                  <Input
                    value={form.basePrice}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, basePrice: event.target.value }))
                    }
                    inputMode="numeric"
                    dir="ltr"
                  />
                </Field>
                <Field label={copy.totalPrice} error={fieldError("totalPrice")}>
                  <Input
                    value={form.totalPrice}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, totalPrice: event.target.value }))
                    }
                    inputMode="numeric"
                    dir="ltr"
                  />
                </Field>
              </div>
              {lineTotal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, totalPrice: lineTotal }))}
                >
                  {copy.useLineTotal}
                </Button>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">{copy.options}</h2>
              {optionsQuery.isLoading && (
                <p className="text-xs text-gray-500">{copy.optionsLoading}</p>
              )}
              {optionsQuery.isError && (
                <p className="text-xs text-amber-800">{copy.optionsError}</p>
              )}
              {optionsQuery.isSuccess && sections.length === 0 && (
                <p className="text-xs text-gray-500">{copy.optionsEmpty}</p>
              )}
              {sections.map((section) => (
                <div key={section.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
                  {section.fields.map((field) => (
                    <OptionField
                      key={field.id}
                      field={field}
                      form={form}
                      copy={copy}
                      error={fieldError(`dimensions.${field.id}`)}
                      onChange={setForm}
                    />
                  ))}
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <Field label={copy.notes}>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                />
              </Field>
            </section>

            {submitError && (
              <p className="text-sm text-red-700" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={createOrder.isPending} aria-busy={createOrder.isPending}>
              {createOrder.isPending ? copy.submitting : copy.submit}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function OptionField({
  field,
  form,
  copy,
  error,
  onChange,
}: {
  field: StaffOptionField;
  form: FactoryOrderFormInput;
  copy: Copy;
  error?: string;
  onChange: (update: (prev: FactoryOrderFormInput) => FactoryOrderFormInput) => void;
}) {
  if (field.kind === "header") {
    return <p className="text-xs text-gray-500">{field.label}</p>;
  }

  if (field.kind === "dimension") {
    return (
      <Field label={fieldLabel(field)} error={error}>
        <Input
          value={form.dimensions[field.id] ?? ""}
          onChange={(event) => onChange((prev) => setDimensionValue(prev, field.id, event.target.value))}
          inputMode="decimal"
          dir="ltr"
          placeholder={field.placeholder}
        />
      </Field>
    );
  }

  if (field.kind === "text") {
    return (
      <Field label={field.label}>
        <Input
          value={form.selections[field.id] ?? ""}
          onChange={(event) => onChange((prev) => setTextSelection(prev, field.id, event.target.value))}
          placeholder={field.placeholder}
        />
      </Field>
    );
  }

  if (field.kind === "multi") {
    const selected = selectedChoiceIds(field, form.selections[field.id]);
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-500">{field.label}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {field.choices.map((choice) => (
            <label key={choice.id} className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={selected.includes(choice.id)}
                onChange={() => onChange((prev) => toggleMultiSelection(prev, field, choice.id))}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </div>
        {field.choices
          .filter((choice) => selected.includes(choice.id) && choice.subs.length > 0)
          .map((choice) =>
            choice.subs.map((sub) => (
              <SubField
                key={`${choice.id}-${sub.id}`}
                field={field}
                sub={sub}
                form={form}
                copy={copy}
                onChange={onChange}
              />
            ))
          )}
      </div>
    );
  }

  const selected = form.selections[field.id] ?? "";
  const active = field.choices.find((choice) => choice.id === selected);
  return (
    <div className="space-y-2">
      <Field label={field.label}>
        <select
          className={selectClass}
          value={selected}
          onChange={(event) => onChange((prev) => setSingleSelection(prev, field, event.target.value))}
        >
          <option value="">{copy.none}</option>
          {field.choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </Field>
      {active?.subs.map((sub) => (
        <SubField key={sub.id} field={field} sub={sub} form={form} copy={copy} onChange={onChange} />
      ))}
    </div>
  );
}

function SubField({
  field,
  sub,
  form,
  copy,
  onChange,
}: {
  field: StaffOptionField;
  sub: StaffOptionSub;
  form: FactoryOrderFormInput;
  copy: Copy;
  onChange: (update: (prev: FactoryOrderFormInput) => FactoryOrderFormInput) => void;
}) {
  const value = form.subSelections[field.id]?.[sub.id] ?? "";
  const label = sub.unit ? `${sub.label} (${sub.unit})` : sub.label;
  if (sub.choices.length > 0) {
    return (
      <Field label={label}>
        <select
          className={selectClass}
          value={value}
          onChange={(event) =>
            onChange((prev) => setSubSelection(prev, field, sub.id, event.target.value))
          }
        >
          <option value="">{copy.none}</option>
          {sub.choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={label} hint={sub.type === "file_upload" ? copy.fileHint : undefined}>
      <Input
        value={value}
        onChange={(event) => onChange((prev) => setSubSelection(prev, field, sub.id, event.target.value))}
        placeholder={sub.placeholder}
        dir={sub.type === "number_input" ? "ltr" : undefined}
        inputMode={sub.type === "number_input" ? "decimal" : undefined}
      />
    </Field>
  );
}

function fieldLabel(field: StaffOptionField): string {
  return field.unit ? `${field.label} (${field.unit})` : field.label;
}
