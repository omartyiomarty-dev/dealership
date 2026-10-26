import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { makeP, pick, enumLabel } from "@/lib/i18n";
import { searchVehicles, parseSearchParams } from "@/lib/vehicles";
import { AVAILABILITIES, VEHICLE_STATUSES } from "@/lib/constants";
import { safeEnum } from "@/lib/safe";
import { mediaUrl } from "@/lib/media-url";
import VehicleRowActions from "./VehicleRowActions";

export default async function AdminVehicles({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const p = makeP(lang);
  const params = parseSearchParams(sp);
  params.includeDrafts = true;
  params.status = safeEnum(typeof sp.status === "string" ? sp.status : undefined, VEHICLE_STATUSES);
  params.featured = sp.featured === "1";
  params.perPage = 20;
  const { items, total, page, perPage } = await searchVehicles(params);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const q = typeof sp.q === "string" ? sp.q : "";
  const link = (n: number) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (typeof v === "string") u.set(k, v); u.set("page", String(n)); return `/admin/vehicles?${u}`; };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{p("المركبات", "Vehicles")} <span className="text-base font-normal text-gray-500">({total})</span></h1>
        <Link href="/admin/vehicles/new" className="btn-primary">+ {p("إضافة مركبة", "Add Vehicle")}</Link>
      </div>
      <form className="card mb-4 flex flex-wrap gap-2 p-3" method="get">
        <input name="q" defaultValue={q} className="input flex-1 min-w-40" placeholder={p("بحث بالاسم أو رقم السيارة...", "Search by name or stock no...")} />
        <select name="status" defaultValue={params.status ?? ""} className="input w-auto"><option value="">{p("كل الحالات", "All statuses")}</option><option value="published">{p("منشورة", "Published")}</option><option value="draft">{p("مسودة", "Draft")}</option></select>
        <select name="tx" defaultValue={params.tx === "both" ? "" : params.tx} className="input w-auto"><option value="">{p("بيع وإيجار", "Sale & Rent")}</option><option value="sale">{p("للبيع", "Sale")}</option><option value="rent">{p("للإيجار", "Rent")}</option></select>
        <select name="availability" defaultValue={params.availability?.[0] ?? ""} className="input w-auto"><option value="">{p("كل التوفر", "Any availability")}</option>{AVAILABILITIES.map((a) => <option key={a} value={a}>{enumLabel(lang, a)}</option>)}</select>
        <button className="btn-primary">{p("بحث", "Search")}</button>
      </form>
      {items.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">{p("لا توجد مركبات", "No vehicles found")}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-start text-xs uppercase text-gray-500">
              <tr><th className="p-3 text-start">{p("المركبة", "Vehicle")}</th><th className="p-3 text-start">{p("النوع", "Type")}</th><th className="p-3 text-start">{p("السعر", "Price")}</th><th className="p-3 text-start">{p("الحالة", "Status")}</th><th className="p-3 text-start">{p("التوفر", "Availability")}</th><th className="p-3 text-start">{p("إجراءات", "Actions")}</th></tr>
            </thead>
            <tbody className="divide-y">
              {items.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {v.mainImageId && <img src={mediaUrl(v.mainImageId)!} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div>
                        <Link href={`/admin/vehicles/${v.id}`} className="font-semibold hover:text-primary">{pick(lang, v.titleAr, v.titleEn)}</Link>
                        <div className="text-xs text-gray-500" dir="ltr">#{v.stockNumber} · {v.make} {v.model} {v.year} {v.featured ? " ·" : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><span className={`badge ${v.transactionType === "rent" ? "bg-accent text-white" : "bg-primary text-white"}`}>{v.transactionType === "rent" ? p("إيجار", "Rent") : p("بيع", "Sale")}</span></td>
                  <td className="p-3" dir="ltr">{v.price ? Number(v.price).toLocaleString() : "—"}</td>
                  <td className="p-3"><span className={`badge ${v.status === "published" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{v.status === "published" ? p("منشورة", "Published") : p("مسودة", "Draft")}</span></td>
                  <td className="p-3">{enumLabel(lang, v.availability)}</td>
                  <td className="p-3"><VehicleRowActions id={v.id} slug={v.slug} status={v.status} availability={v.availability} featured={v.featured} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && <Link className="btn-outline" href={link(page - 1)}>‹</Link>}
          <span className="px-3 py-2 text-sm">{page} / {pages}</span>
          {page < pages && <Link className="btn-outline" href={link(page + 1)}>›</Link>}
        </div>
      )}
    </div>
  );
}
