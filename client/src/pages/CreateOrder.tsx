import { ArrowLeft, ArrowRight, Check, ChevronRight, Gift, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CategoryIcon, contrastText, formatJOD, governorates, userErrorMessage } from "@/lib/faj2ni";

const defaultCustomer = { fullName: "", phone: "", password: "", governorate: "", area: "", address: "" };

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.storefront.bootstrap.useQuery();
  const { data: account } = trpc.customer.me.useQuery();
  const create = trpc.order.create.useMutation({ onError: error => toast.error(userErrorMessage(error)) });
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState(defaultCustomer);
  const categories = data?.categories ?? [];
  const values = data?.settings ?? {};
  const budgets = useMemo(() => (values.budgets || "5000,10000,15000,20000,30000,50000,100000").split(",").map(Number).filter(Boolean), [values.budgets]);
  const shippingRates = useMemo(() => { try { return JSON.parse(values.shippingRates || "{}") as Record<string, string>; } catch { return {}; } }, [values.shippingRates]);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("category");
    if (raw && categories.some(category => category.id === Number(raw))) setCategoryId(Number(raw));
  }, [categories]);
  useEffect(() => {
    if (account?.customer) setCustomer(current => ({ ...current, fullName: account.customer.fullName, phone: account.customer.phone, governorate: account.customer.governorate, area: account.customer.area, address: "" }));
  }, [account]);
  const resolvedBudget = customBudget ? Math.round(Number(customBudget) * 1000) : budget;
  const selectedGovernorate = customer.governorate || account?.customer.governorate || "";
  const deliveryFils = Math.max(0, Number(shippingRates[selectedGovernorate] || 0) * 1000);
  const advance = () => {
    if (step === 1 && !categoryId) return toast.error("اختر فئة واحدة للمتابعة.");
    if (step === 2 && (!resolvedBudget || resolvedBudget < 5000)) return toast.error("الحد الأدنى للميزانية هو 5 دنانير.");
    if (step === 4 && (!selectedGovernorate || !customer.address)) return toast.error("يرجى اختيار المحافظة والعنوان بالتفصيل.");
    if (step === 4 && !account && (!customer.fullName || !customer.phone || !customer.password)) return toast.error("يرجى تعبئة الاسم والهاتف وكلمة المرور.");
    if (step === 4 && !account && customer.password.length < 6) return toast.error("كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.");
    if (step === 4 && !account && !/^[0-9+\-\s]{7,32}$/.test(customer.phone)) return toast.error("رقم الهاتف غير صالح. استخدم أرقامًا فقط بطول 7 إلى 32 خانة.");
    if (step === 4 && customer.address.trim().length < 5) return toast.error("العنوان بالتفصيل يجب أن يكون 5 أحرف على الأقل.");
    setStep(current => Math.min(5, current + 1));
  };
  const submit = async () => {
    if (!categoryId || !resolvedBudget) return setSubmitError("اختر الفئة والميزانية قبل تأكيد الطلب.");
    setSubmitError("");
    try {
      const customerPayload = account ? { governorate: selectedGovernorate, address: customer.address, area: "" } : { ...customer, area: "" };
      const result = await create.mutateAsync({ categoryId, budgetFils: resolvedBudget, notes: notes || undefined, ...customerPayload });
      navigate(`/order-success/${result.orderNumber}`);
    } catch (error) {
      setSubmitError(userErrorMessage(error as { message?: string; data?: unknown }));
    }
  };
  const selectedCategory = categories.find(category => category.id === categoryId);
  return <div className="flow-page" style={{ "--primary": values.primaryColor || "#6c5ce7", "--primary-foreground": contrastText(values.primaryColor || "#6c5ce7"), "--secondary": values.secondaryColor || "#f2b5d4", "--canvas": values.backgroundColor || "#fcfbff", "--ink": contrastText(values.backgroundColor || "#fcfbff"), "--muted": contrastText(values.backgroundColor || "#fcfbff") === "#ffffff" ? "#ded9e8" : "#6f6981", "--radius": `${values.borderRadius || "18"}px` } as React.CSSProperties}>
    <div className="container-f"><div className="flow-header"><button className="btn btn-outline btn-sm" onClick={() => navigate("/")}><ChevronRight size={15} /> الرئيسية</button><h1>أنشئ صندوقك</h1><p>خطوات قليلة ونبدأ بتجهيز مفاجأتك.</p><div className="progress-steps">{[1, 2, 3, 4, 5].map(item => <span key={item} className={`progress-segment ${item <= step ? "active" : ""}`} />)}</div></div>
      <div className="form-panel">
        {isLoading ? <div className="loading-block"><Loader2 className="animate-spin" /> جاري تجهيز النموذج...</div> : <>
          {step === 1 && <section><h2>ما فئة الصندوق؟</h2><p className="section-subtitle">اختر فئة واحدة وسنرتب التفاصيل المناسبة.</p><div className="category-grid">{categories.map(category => <button className={`category-card ${category.id === categoryId ? "selected" : ""}`} key={category.id} onClick={() => setCategoryId(category.id)}><span className="category-icon"><CategoryIcon name={category.image} /></span><b>{category.name}</b>{category.id === categoryId && <Check size={16} style={{ position: "absolute", left: 15, top: 15, color: "var(--primary)" }} />}</button>)}</div></section>}
          {step === 2 && <section><h2>حدد ميزانيتك</h2><div className="budget-grid">{budgets.map(value => <button key={value} onClick={() => { setBudget(value); setCustomBudget(""); }} className={`budget-option ${budget === value && !customBudget ? "selected" : ""}`}>{formatJOD(value)}</button>)}</div><div className="field"><label>ميزانية أخرى</label><input type="number" min="5" inputMode="decimal" value={customBudget} onChange={event => { setCustomBudget(event.target.value); setBudget(null); }} placeholder="مثال: 25" /><span className="help">أدخل المبلغ بالدينار الأردني.</span></div></section>}
          {step === 3 && <section><h2>أي تفاصيل إضافية؟</h2><p className="section-subtitle">الملاحظات اختيارية، لكنها تساعدنا في اختيار مفاجأة أجمل.</p><div className="field" style={{ marginTop: 20 }}><label>ملاحظاتك</label><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="مثلاً: الهدية لشخص عمره 20 سنة، يحب السيارات..." maxLength={1500} /><span className="help">{notes.length}/1500</span></div></section>}
          {step === 4 && <section><h2>وين نوصل الصندوق؟</h2><p className="section-subtitle">{account ? "اكتب عنوان التوصيل لهذا الطلب." : "سنستخدم هذه البيانات للتواصل والتوصيل فقط."}</p><div className="field-grid" style={{ marginTop: 20 }}>
            {!account && <><TextField label="الاسم الكامل" value={customer.fullName} onChange={value => setCustomer({ ...customer, fullName: value })} placeholder="اكتب الاسم" /><TextField label="رقم الهاتف" value={customer.phone} onChange={value => setCustomer({ ...customer, phone: value })} placeholder="07XXXXXXXX" inputMode="tel" /><TextField label="كلمة المرور للحساب" value={customer.password} onChange={value => setCustomer({ ...customer, password: value })} placeholder="6 أحرف أو أرقام على الأقل" type="password" /></>}
            <div className="field"><label>المحافظة</label><select value={selectedGovernorate} onChange={event => setCustomer({ ...customer, governorate: event.target.value })}><option value="">اختر المحافظة</option>{governorates.map(item => <option key={item} value={item}>{item}</option>)}</select></div>
            <div className="field"><label>سعر التوصيل</label><input value={formatJOD(deliveryFils)} readOnly /></div>
            <TextField label="العنوان بالتفصيل" value={customer.address} onChange={value => setCustomer({ ...customer, address: value })} placeholder="الشارع، البناية، أي نقطة دالة" className="span-2" />
          </div></section>}
          {step === 5 && <section><h2>راجع طلبك</h2><p className="section-subtitle">تأكد من المعلومات قبل إرسال الطلب.</p><div className="info-card" style={{ marginTop: 20 }}><div className="info-list"><div><span>الفئة</span><strong>{selectedCategory?.name}</strong></div><div><span>الميزانية</span><strong>{formatJOD(resolvedBudget ?? undefined)}</strong></div><div><span>سعر التوصيل</span><strong>{formatJOD(deliveryFils)}</strong></div><div><span>الاسم والتواصل</span><strong>{customer.fullName} — {customer.phone}</strong></div><div><span>عنوان التوصيل</span><strong>{customer.governorate}، {customer.address}</strong></div>{notes && <div><span>ملاحظاتك</span><strong>{notes}</strong></div>}</div></div></section>}
          {submitError && <div role="alert" className="error-banner">{submitError}</div>}
          <div className="form-actions"><button className="btn btn-outline" onClick={() => step === 1 ? navigate("/") : setStep(step - 1)}><ArrowRight size={16} /> {step === 1 ? "إلغاء" : "السابق"}</button>{step < 5 ? <button className="btn btn-primary" onClick={advance}>متابعة <ArrowLeft size={16} /></button> : <button className="btn btn-primary" disabled={create.isPending} onClick={submit}>{create.isPending ? <Loader2 className="animate-spin" size={16} /> : <Gift size={16} />} تأكيد الطلب</button>}</div>
        </>}
      </div></div>
  </div>;
}

function TextField({ label, value, onChange, placeholder, inputMode, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; type?: string; className?: string }) {
  return <div className={`field ${className}`}><label>{label}</label><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} type={type} /></div>;
}
