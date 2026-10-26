import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { makeT, pick } from "@/lib/i18n";
import { db } from "@/db";
import { services } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { I } from "@/components/Icon";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: makeT(lang)("nav_services") };
}

export default async function ServicesPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const rows = await db.select().from(services).where(eq(services.published, true)).orderBy(asc(services.sortOrder));
  return (
    <div className="container-x py-12">
      <h1 className="section-title">{t("services_title")}</h1>
      {rows.length === 0 ? (
        <p className="mt-6 text-gray-500">{t("no_services")}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <div key={s.id} className="card p-6">
              <div className="text-4xl">{s.icon || <I.wrench className="h-9 w-9 text-primary" />}</div>
              <h2 className="mt-3 text-lg font-bold text-gray-900">{pick(lang, s.titleAr, s.titleEn)}</h2>
              <p className="mt-2 whitespace-pre-line text-gray-600">{pick(lang, s.descriptionAr, s.descriptionEn)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
