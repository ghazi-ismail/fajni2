import { ArrowLeft, Gift, UserRound } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { CategoryIcon, contrastText } from "@/lib/faj2ni";

export default function Home() {
  const { data, isLoading, error } = trpc.storefront.bootstrap.useQuery();
  const values = data?.settings ?? {};
  const brand = values.brandName || "فاجئني";
  const categories = data?.categories ?? [];
  const startPath = (id?: number) => id ? `/create-order?category=${id}` : "/create-order";
  return (
    <div className="page-shell" style={{ "--primary": values.primaryColor || "#6c5ce7", "--primary-foreground": contrastText(values.primaryColor || "#6c5ce7"), "--secondary": values.secondaryColor || "#f2b5d4", "--canvas": values.backgroundColor || "#fcfbff", "--ink": contrastText(values.backgroundColor || "#fcfbff"), "--muted": contrastText(values.backgroundColor || "#fcfbff") === "#ffffff" ? "#ded9e8" : "#6f6981", "--radius": `${values.borderRadius || "18"}px` } as React.CSSProperties}>
      <header className="site-header"><div className="container-f header-row">
        <Link href="/" className="brand"><span className="brand-mark"><Gift size={18} /></span><span>{brand}</span></Link>
        <div className="header-actions"><Link href="/account" className="btn btn-outline"><UserRound size={16} /> حسابي</Link><Link href="/create-order" className="btn btn-primary">{values.ctaText || "أنشئ طلبك"}<ArrowLeft size={16} /></Link></div>
      </div></header>
      <main>
        <section className="hero"><div className="container-f hero-grid">
          <div><h1>{values.homeTitle || "شو مخبّي"} <em>{(values.homeTitle || "شو مخبّي الصندوق؟").includes("الصندوق") ? "" : "الصندوق؟"}</em></h1><p className="hero-copy">{values.homeDescription || "اختار الفئة، حدد ميزانيتك، وخلي علينا اختيار المفاجأة."}</p><Link href="/create-order" className="btn btn-primary">{values.ctaText || "أنشئ طلبك"}<ArrowLeft size={17} /></Link></div>
          <div className="hero-visual"><img className="hero-photo" src="/manus-storage/faj2ni-gift-box_4f923d28.jpg" alt="صندوق هدايا مختار بعناية" /><div className="hero-card"><span className="dot" /> <strong>مفاجأة بطابعك</strong><span>منتجات وتفاصيل منتقاة حسب الفئة والميزانية.</span></div></div>
        </div></section>
        <section className="section"><div className="container-f"><div className="section-title-row"><div><h2>اختر فئتك</h2><p className="section-subtitle">كل صندوق يتجهز حسب اختياراتك، بدون تعقيد.</p></div></div>
          {isLoading ? <div className="loading-block">جاري تحميل الفئات...</div> : error ? <div className="empty-state">تعذر تحميل الفئات. حاول التحديث بعد قليل.</div> : <div className="category-grid">{categories.map(category => <Link key={category.id} href={startPath(category.id)} className="category-card"><span className="category-icon"><CategoryIcon name={category.image} /></span><b>{category.name}</b></Link>)}</div>}
        </div></section>
        <section className="section"><div className="container-f"><div className="how-grid">{[["01", "اختر الفئة", "اختر عالم الصندوق الأقرب للشخص أو المناسبة."], ["02", "حدد الميزانية", "ميزانية واضحة وخيارات تناسبك."], ["03", "اترك الباقي لنا", "نرتب مفاجأتك بالتفاصيل التي تحبها."]].map(item => <div className="how-item" key={item[0]}><span className="how-no">{item[0]}</span><div><strong>{item[1]}</strong><p>{item[2]}</p></div></div>)}</div></div></section>
      </main>
      <footer className="site-footer"><div className="container-f">© {new Date().getFullYear()} {brand} — صناديق مفاجآت مرتبة لك.</div></footer>
    </div>
  );
}
