import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { makeP, makeT, formatNumber } from "@/lib/i18n";
import { getSalesStats, getSalesByMonth, getBreakdownByType, getSoldByCategory, getRecentSales } from "@/lib/sales";
import { VEHICLE_TYPE_ICONS_FALLBACK } from "./labels";
import SalesActions from "./SalesActions";

export default async function SalesPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const p = makeP(lang);
  const nf = (n: number) => formatNumber(lang, Math.round(n));

  const [stats, months, byType, byCat, recent] = await Promise.all([
    getSalesStats(),
    getSalesByMonth(),
    getBreakdownByType(),
    getSoldByCategory(),
    getRecentSales(8),
  ]);

  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const cards = [
    { l: t("sold_count"), v: nf(stats.sold), sub: `${nf(stats.forSale)} ${p("معروضة للبيع", "listed for sale")}`, c: "bg-gray-900" },
    { l: t("sold_value"), v: `${nf(stats.soldValue)} ${t("egp")}`, sub: p("إجمالي المبيعات المنفذة", "total completed sales"), c: "bg-primary" },
    { l: t("rented_count"), v: nf(stats.rented), sub: `${nf(stats.forRent)} ${p("معروضة للإيجار", "listed for rent")}`, c: "bg-accent" },
    { l: t("avg_sale"), v: `${nf(stats.avgSalePrice)} ${t("egp")}`, sub: p("لمتوسط عملية البيع", "per completed sale"), c: "bg-sky-700" },
    { l: t("avg_days"), v: stats.avgDaysToSale != null ? nf(stats.avgDaysToSale) : "—", sub: p("من الإضافة حتى البيع", "from listing to sold"), c: "bg-violet-700" },
    { l: t("available_value"), v: `${nf(stats.availableValue)} ${t("egp")}`, sub: `${nf(stats.active)} ${p("مركبة متاحة الآن", "vehicles available")}`, c: "bg-teal-700" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("sold_stats")}</h1>
        <Link href="/admin/vehicles" className="btn-outline">{p("قائمة المركبات", "Vehicles list")}</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.l} className={`${c.c} rounded-xl p-4 text-white`}>
            <div className="text-2xl font-extrabold leading-tight">{c.v}</div>
            <div className="mt-1 text-sm font-semibold opacity-95">{c.l}</div>
            <div className="mt-1 text-xs opacity-75">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">{t("by_month")}</h2>
          {months.length === 0 ? (
            <p className="text-sm text-gray-500">{t("no_sales_yet")}</p>
          ) : (
            <ul className="space-y-2">
              {months.map((m) => (
                <li key={m.month} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-xs text-gray-500" dir="ltr">{m.month}</span>
                  <span className="h-6 rounded bg-primary" style={{ width: `${Math.max(6, (m.count / maxMonth) * 100)}%` }} />
                  <span className="shrink-0 text-sm font-semibold">{nf(m.count)}</span>
                  {m.value > 0 && <span className="shrink-0 text-xs text-gray-500">{nf(m.value)} {t("egp")}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold">{t("by_type")}</h2>
          {byType.length === 0 ? <p className="text-sm text-gray-500">—</p> : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500"><tr><th className="p-2 text-start">{p("النوع", "Type")}</th><th className="p-2">{t("sold_count")}</th><th className="p-2">{t("rented_count")}</th><th className="p-2">{p("متاح", "Available")}</th></tr></thead>
              <tbody className="divide-y">
                {byType.map((r) => (
                  <tr key={r.type}>
                    <td className="p-2 font-medium">{VEHICLE_TYPE_ICONS_FALLBACK[r.type] ?? ""} {p(r.type, r.type)}</td>
                    <td className="p-2 text-center font-semibold text-gray-900">{nf(r.sold)}</td>
                    <td className="p-2 text-center">{nf(r.rented)}</td>
                    <td className="p-2 text-center text-gray-500">{nf(r.available)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {byCat.length > 0 && (
          <section className="card p-5">
            <h2 className="mb-4 font-bold">{t("by_category")}</h2>
            <ul className="space-y-2">
              {byCat.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate">{p(c.nameAr, c.nameEn)}</span>
                  <span className="h-2 w-24 rounded bg-gray-200"><span className="block h-2 rounded bg-primary" style={{ width: `${Math.min(100, (c.sold / Math.max(1, byCat[0].sold)) * 100)}%` }} /></span>
                  <span className="w-8 text-end text-sm font-semibold">{nf(c.sold)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-5">
          <h2 className="mb-4 font-bold">{t("recent_sales")}</h2>
          {recent.length === 0 ? <p className="text-sm text-gray-500">{t("no_sales_yet")}</p> : (
            <ul className="divide-y text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <a href={`/vehicles/${r.slug}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:text-primary">
                    #{r.stockNumber} · {p(r.titleAr, r.titleEn)}
                  </a>
                  <span className="shrink-0 text-xs text-gray-500" dir="ltr">
                    {r.soldAt ? new Date(r.soldAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB") : "—"}
                  </span>
                  <span className="badge shrink-0 bg-gray-100">{r.availability === "sold" ? t("sold_count") : t("rented_count")}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <SalesActions />
    </div>
  );
}
