import { CheckCircle2, Gift, Home, PackageCheck } from "lucide-react";
import { Link, useRoute } from "wouter";
import { StatusBadge } from "@/lib/faj2ni";

export default function OrderSuccess() {
  const [, params] = useRoute("/order-success/:number");
  const orderNumber = params?.number || "FN-000000";
  return <div className="flow-page"><div className="container-f"><div className="success-box"><div className="success-icon"><Gift size={34} /></div><h1>تم استلام طلبك بنجاح</h1><p className="section-subtitle">سنقوم بمراجعة طلبك والتواصل معك لتأكيد التفاصيل.</p><span className="order-number">{orderNumber}</span><div><StatusBadge status="NEW" /></div><div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 27, flexWrap: "wrap" }}><Link href="/account" className="btn btn-primary"><PackageCheck size={16} /> تابع طلباتك</Link><Link href="/" className="btn btn-outline"><Home size={16} /> الرئيسية</Link></div><p style={{ marginTop: 22, color: "var(--muted)", fontSize: 11 }}><CheckCircle2 size={13} style={{ verticalAlign: "middle" }} /> لا تحتاج إلى دفع إلكتروني الآن — سنتواصل معك لتأكيد تفاصيل الاستلام.</p></div></div></div>;
}
