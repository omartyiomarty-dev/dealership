import Link from "next/link";
import { db } from "@/db";
import { vehicles, inquiries, categories } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getLang } from "@/lib/lang-server";
import { makeP, pick } from "@/lib/i18n";
import { I } from "@/components/Icon";

export default async function Dashboard() {
  const lang = await getLang();
  const p = makeP(lang);
  const [s] = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${vehicles.status} = 'published')::int`,
      drafts: sql<number>`count(*) filter (where ${vehicles.status} = 'draft')::int`,
      featured: sql<number>`count(*) filter (where ${vehicles.featured})::int`,
      sale: sql<number>`count(*) filter (where ${vehicles.transactionType} = 'sale')::int`,
      rent: sql<number>`count(*) filter (where ${vehicles.transactionType} = 'rent')::int`,
      sold: sql<number>`count(*) filter (where ${vehicles.availability} = 'sold')::int`,
    })
    .from(vehicles);
  const [inq] = await db.select({ newC: sql<number>`count(*) filter (where ${inquiries.status} = 'new')::int`, total: sql<number>`count(*)::int` }).from(inquiries);
  const [cat] = await db.select({ c: sql<number>`count(*)::int` }).from(categories);
  const latestInq = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(5);
  const latestVeh = await db.select({ id: vehicles.id, titleAr: vehicles.titleAr, titleEn: vehicles.titleEn, status: vehicles.status, stockNumber: vehicles.stockNumber, slug: vehicles.slug }).from(vehicles).orderBy(desc(vehicles.createdAt)).limit(5);

  const stats = [
    { l: p("إجمالي المركبات", "Total Vehicles"), v: s.total, href: "/admin/vehicles", c: "bg-gray-900" },
    { l: p("منشورة", "Published"), v: s.published, href: "/admin/vehicles?status=published", c: "bg-primary" },
    { l: p("مسودات", "Drafts"), v: s.drafts, href: "/admin/vehicles?status=draft", c: "bg-gray-500" },
    { l: p("مميزة", "Featured"), v: s.featured, href: "/admin/vehicles?featured=1", c: "bg-accent" },
    { l: p("للبيع", "For Sale"), v: s.sale, href: "/admin/vehicles?tx=sale", c: "bg-emerald-700" },
    { l: p("للإيجار", "For Rent"), v: s.rent, href: "/admin/vehicles?tx=rent", c: "bg-sky-700" },
    { l: p("مباعة", "Sold"), v: s.sold, href: "/admin/vehicles?availability=sold", c: "bg-rose-700" },
    { l: p("استفسارات جديدة", "New Inquiries"), v: inq.newC, href: "/admin/inquiries", c: "bg-violet-700" },
    { l: p("الفئات", "Categories"), v: cat.c, href: "/admin/categories", c: "bg-teal-700" },
  ];
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{p("لوحة التحكم", "Dashboard")}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/vehicles/new" className="btn-primary"><I.plus className="h-4 w-4" /> {p("إضافة مركبة", "Add vehicle")}</Link>
          <Link href="/admin/categories" className="btn-outline"><I.tag className="h-4 w-4" /> {p("الفئات", "Categories")}</Link>
          <Link href="/admin/settings" className="btn-outline"><I.pin className="h-4 w-4" /> {p("بيانات المعرض", "Dealership info")}</Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn-outline"><I.globe className="h-4 w-4" /> {p("معاينة الموقع", "Preview site")}</a>
        </div>
      </div>
      {s.total === 0 && (
        <div className="card mb-6 border-primary/30 bg-primary/5 p-5">
          <h2 className="font-bold text-gray-900">👋 {p("ابدأ من هنا", "Start here")}</h2>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-gray-700">
            <li>{p("أدخل بيانات المعرض (الهاتف، واتساب، العنوان، الروابط).", "Enter dealership info (phone, WhatsApp, address, links).")}</li>
            <li>{p("أنشئ الفئات التي ستظهر في «اختار معايا» مع أيقوناتها.", "Create the categories (with icons) for “Help Me Choose”.")}</li>
            <li>{p("أضف أول مركبة (سيارة، موتوسيكل، نقل...) واختر بيع أو إيجار، ثم انشرها.", "Add your first vehicle (car, motorcycle, truck...) choose sale or rent, then publish.")}</li>
            <li>{p("اختر الألوان والشعار من صفحة المظهر.", "Pick colors and logo in Appearance.")}</li>
          </ol>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((x) => (
          <Link key={x.l} href={x.href} className={`${x.c} rounded-xl p-4 text-white transition hover:opacity-90`}>
            <div className="text-3xl font-extrabold">{x.v}</div>
            <div className="text-sm opacity-90">{x.l}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{p("آخر الاستفسارات", "Latest Inquiries")}</h2><Link href="/admin/inquiries" className="group inline-flex items-center gap-1 text-sm text-primary">{p("الكل", "All")} <I.arrowLeft className="h-3 w-3 transition group-hover:translate-x-0.5 rtl:-scale-x-100" /></Link></div>
          {latestInq.length === 0 ? <p className="text-sm text-gray-500">{p("لا توجد استفسارات بعد", "No inquiries yet")}</p> : (
            <ul className="divide-y text-sm">
              {latestInq.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.name} — <span dir="ltr">{i.phone}</span></span><span className={`badge ${i.status === "new" ? "bg-accent text-white" : "bg-gray-100"}`}>{i.status}</span></li>)}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{p("آخر المركبات", "Latest Vehicles")}</h2><Link href="/admin/vehicles/new" className="btn-primary !py-1.5"><I.plus className="h-3.5 w-3.5" /> {p("إضافة", "Add")}</Link></div>
          {latestVeh.length === 0 ? <p className="text-sm text-gray-500">{p("لم تتم إضافة مركبات بعد", "No vehicles added yet")}</p> : (
            <ul className="divide-y text-sm">
              {latestVeh.map((v) => <li key={v.id} className="flex justify-between py-2"><Link href={`/admin/vehicles/${v.id}`} className="hover:text-primary">#{v.stockNumber} · {pick(lang, v.titleAr, v.titleEn)}</Link><span className={`badge ${v.status === "published" ? "bg-primary/10 text-primary-dark" : "bg-gray-100"}`}>{v.status}</span></li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
