from pathlib import Path
import re

path = Path('/home/ubuntu/faj2ni/client/src/pages/Admin.tsx')
s = path.read_text()
s = s.replace('CategoryIcon, dateAr, formatJOD, governorates, StatusBadge, statusMeta', 'CategoryIcon, categoryIconOptions, dateAr, formatJOD, governorates, StatusBadge, statusMeta')
s = s.replace('type Tab = "dashboard" | "orders" | "categories" | "settings" | "expenses" | "warehouse";', 'type Tab = "dashboard" | "orders" | "categories" | "settings" | "shipping" | "expenses" | "warehouse";')
s = s.replace('{ tab: "categories", label: "الفئات", icon: Tags }, { tab: "settings", label: "إعدادات الموقع", icon: Settings2 },', '{ tab: "categories", label: "الفئات", icon: Tags }, { tab: "settings", label: "إعدادات الموقع", icon: Settings2 }, { tab: "shipping", label: "أسعار التوصيل", icon: Truck },')
s = s.replace('categories: ["الفئات", "تنظيم صناديق المفاجآت المعروضة"], settings: ["إعدادات الموقع", "تعديل النصوص والهوية البصرية"], expenses:', 'categories: ["الفئات", "تنظيم صناديق المفاجآت المعروضة"], settings: ["إعدادات الموقع", "تعديل النصوص والهوية البصرية"], shipping: ["أسعار التوصيل", "تحديد سعر التوصيل لكل محافظة"], expenses:')
s = s.replace('const utils = trpc.useUtils();\n  const logout', 'const utils = trpc.useUtils();\n  const { data: siteSettings } = trpc.admin.settings.useQuery();\n  const adminTheme = { "--primary": siteSettings?.primaryColor || "#6c5ce7", "--secondary": siteSettings?.secondaryColor || "#f2b5d4", "--canvas": siteSettings?.backgroundColor || "#fcfbff" } as React.CSSProperties;\n  const logout')
s = s.replace('return <div className="admin-shell"><aside', 'return <div className="admin-shell" style={adminTheme}><aside')
s = s.replace('{!detailOrderId && tab !== "dashboard" && <button className="btn btn-outline btn-sm" onClick={() => navigate("/")}><ArrowRight size={14} /> المتجر</button>}', '')
s = s.replace('{tab === "settings" && <Settings />} {tab === "expenses"', '{tab === "settings" && <Settings />} {tab === "shipping" && <Shipping />} {tab === "expenses"')
s = s.replace('<th>الميزانية</th><th>التاريخ</th>', '<th>الميزانية</th><th>التوصيل</th><th>التاريخ</th>')
s = s.replace('<td>{formatJOD(order.budgetFils)}</td><td>{dateAr(order.createdAt)}</td>', '<td>{formatJOD(order.budgetFils)}</td><td>{formatJOD(order.deliveryFils)}</td><td>{dateAr(order.createdAt)}</td>')
s = s.replace('const [salePrice, setSalePrice] = useState(0); const [costs', 'const [salePrice, setSalePrice] = useState(0); const [costs')
s = s.replace('setSalePrice(data.salePriceFils); setCosts({', 'setSalePrice(data.salePriceFils); setCosts({')
s = s.replace('setCosts({ boxCostFils: data.costs?.boxCostFils ?? 0, decorationCostFils:', 'setCosts({ boxCostFils: data.costs?.boxCostFils ?? 0, decorationCostFils:')
s = s.replace('saveFinance.mutate({ id, salePriceFils: salePrice, ...costs, items })', 'saveFinance.mutate({ id, salePriceFils: salePrice, deliveryFils: data.deliveryFils, ...costs, items })')
# Replace icon list with shared expanded options.
s = re.sub(r'\{\["Gift", "PawPrint", "Sparkles", "CarFront", "House", "Coffee", "Gamepad2", "GraduationCap", "Dumbbell", "Headphones", "WandSparkles", "Baby", "Gem"\]\.map\(icon => <option key=\{icon\}>\{icon\}</option>\)\}', '{categoryIconOptions.map(icon => <option key={icon}>{icon}</option>)}', s)
# Replace Settings block and insert dedicated Shipping component.
start = s.index('function Settings() {')
end = s.index('function Expenses() {', start)
replacement = '''function Settings() {
  const utils = trpc.useUtils(); const { data } = trpc.admin.settings.useQuery(); const [values, setValues] = useState<Record<string, string>>({}); useEffect(() => { if (data) setValues(data); }, [data]);
  const update = trpc.admin.updateSettings.useMutation({ onSuccess: async () => { toast.success("تم حفظ إعدادات الموقع."); await utils.admin.settings.invalidate(); await utils.storefront.bootstrap.invalidate(); }, onError: error => toast.error(error.message) });
  const set = (key: string, value: string) => setValues({ ...values, [key]: value });
  return <div className="panel"><div className="panel-title"><h2>محتوى وهوية المتجر</h2></div><div className="settings-grid"><Field label="اسم العلامة" value={values.brandName || ""} onChange={value => set("brandName", value)} /><Field label="نص زر الدعوة" value={values.ctaText || ""} onChange={value => set("ctaText", value)} /><Field label="عنوان الصفحة الرئيسية" value={values.homeTitle || ""} onChange={value => set("homeTitle", value)} className="span-2" /><Field label="الوصف" value={values.homeDescription || ""} onChange={value => set("homeDescription", value)} className="span-2" /><div className="field"><label>اللون الأساسي</label><input className="color-input" type="color" value={values.primaryColor || "#6c5ce7"} onChange={event => set("primaryColor", event.target.value)} /></div><div className="field"><label>اللون الثانوي</label><input className="color-input" type="color" value={values.secondaryColor || "#f2b5d4"} onChange={event => set("secondaryColor", event.target.value)} /></div><div className="field"><label>لون الخلفية</label><input className="color-input" type="color" value={values.backgroundColor || "#fcfbff"} onChange={event => set("backgroundColor", event.target.value)} /></div><Field label="استدارة البطاقات (px)" value={values.borderRadius || "18"} onChange={value => set("borderRadius", value)} type="number" /><Field label="خيارات الميزانية بالفلس، مفصولة بفواصل" value={values.budgets || ""} onChange={value => set("budgets", value)} className="span-2" /></div><button className="btn btn-primary" style={{ marginTop: 20 }} disabled={update.isPending} onClick={() => update.mutate({ values })}><Save size={15} /> حفظ التغييرات</button></div>;
}

function Shipping() {
  const utils = trpc.useUtils(); const { data } = trpc.admin.settings.useQuery(); const [values, setValues] = useState<Record<string, string>>({}); useEffect(() => { if (data) setValues(data); }, [data]);
  const update = trpc.admin.updateSettings.useMutation({ onSuccess: async () => { toast.success("تم حفظ أسعار التوصيل."); await utils.admin.settings.invalidate(); await utils.storefront.bootstrap.invalidate(); }, onError: error => toast.error(error.message) });
  let rateMap: Record<string, string> = {}; try { rateMap = JSON.parse(values.shippingRates || "{}"); } catch { rateMap = {}; }
  const setRate = (governorate: string, value: string) => setValues({ ...values, shippingRates: JSON.stringify({ ...rateMap, [governorate]: value }) });
  return <div className="panel"><div className="panel-title"><div><h2>أسعار التوصيل حسب المحافظة</h2><p className="section-subtitle">حدد السعر الذي يظهر للزبون أثناء إنشاء الطلب.</p></div><span className="help">بالدينار الأردني</span></div><div className="settings-grid">{governorates.map(governorate => <Field key={governorate} label={governorate} value={rateMap[governorate] || "0"} onChange={value => setRate(governorate, value)} type="number" />)}</div><button className="btn btn-primary" style={{ marginTop: 20 }} disabled={update.isPending} onClick={() => update.mutate({ values: { shippingRates: values.shippingRates || "{}" } })}><Save size={15} /> حفظ أسعار التوصيل</button></div>;
}

'''
s = s[:start] + replacement + s[end:]
path.write_text(s)
