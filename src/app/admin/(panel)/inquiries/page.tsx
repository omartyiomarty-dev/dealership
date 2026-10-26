import Link from "next/link";
import { db } from "@/db";
import { inquiries, vehicles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getLang } from "@/lib/lang-server";
import { makeP, pick } from "@/lib/i18n";
import { INQUIRY_STATUSES } from "@/lib/constants";
import { safeEnum } from "@/lib/safe";
import { I } from "@/components/Icon";
import InquiryActions from "./InquiryActions";

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  // URL status must be a valid enum value, otherwise fall back to "all".
  const status = safeEnum((await searchParams).status, INQUIRY_STATUSES);
  const lang = await getLang();
  const p = makeP(lang);
  const q = db.select({ i: inquiries, vTitleAr: vehicles.titleAr, vTitleEn: vehicles.titleEn, vSlug: vehicles.slug, vStock: vehicles.stockNumber }).from(inquiries).leftJoin(vehicles, eq(vehicles.id, inquiries.vehicleId)).orderBy(desc(inquiries.createdAt)).limit(200);
  const rows = status ? await q.where(eq(inquiries.status, status)) : await q;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{p("الاستفسارات", "Inquiries")}</h1>
      <div className="mb-4 flex gap-2">
        {[["", p("الكل", "All")], ["new", p("جديد", "New")], ["contacted", p("تم التواصل", "Contacted")], ["closed", p("مغلق", "Closed")]].map(([v, l]) => (
          <Link key={v} href={v ? `/admin/inquiries?status=${v}` : "/admin/inquiries"} className={`chip ${(status ?? "") === v ? "chip-on" : "chip-off"}`}>{l}</Link>
        ))}
      </div>
      {rows.length === 0 ? <div className="card p-10 text-center text-gray-500">{p("لا توجد استفسارات", "No inquiries")}</div> : (
        <div className="space-y-3">
          {rows.map(({ i, vTitleAr, vTitleEn, vSlug, vStock }) => (
            <div key={i.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-bold">{i.name} <span className="text-sm font-normal text-gray-500">· <a dir="ltr" className="text-primary" href={`tel:${i.phone}`}>{i.phone}</a>{i.email && <> · <a className="text-primary" href={`mailto:${i.email}`}>{i.email}</a></>}</span></div>
                  <div className="text-xs text-gray-500">{new Date(i.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")} {i.transactionType && <span className="badge bg-gray-100 ms-1">{i.transactionType === "rent" ? p("إيجار", "Rent") : p("بيع", "Sale")}</span>}</div>
                  {vSlug && <Link href={`/vehicles/${vSlug}`} target="_blank" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><I.car className="h-3.5 w-3.5" /> #{vStock} · {pick(lang, vTitleAr, vTitleEn)}</Link>}
                </div>
                <InquiryActions id={i.id} status={i.status} phone={i.phone} />
              </div>
              <p className="mt-3 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-800">{i.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
