import type { Metadata } from "next";
import { Suspense } from "react";
import { getLang } from "@/lib/lang-server";
import { makeT } from "@/lib/i18n";
import { getFilterOptions, getPublicCategories, getCategoryCounts } from "@/lib/vehicles";
import { getSiteSettings, whatsappLink } from "@/lib/settings";
import VehicleFinder from "@/components/VehicleFinder";
import DbDown from "@/components/DbDown";

// Inventory changes (sold/rented/new) must be reflected immediately.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: makeT(lang)("all_vehicles") };
}

export default async function VehiclesPage() {
  const lang = await getLang();
  let options, cats, counts, site;
  try {
    [options, cats, counts, site] = await Promise.all([getFilterOptions(), getPublicCategories(), getCategoryCounts(), getSiteSettings()]);
  } catch {
    return <DbDown note="list" />;
  }
  const t = makeT(lang);
  const contactHref = site.whatsapp ? whatsappLink(site.whatsapp, "") : site.phone ? `tel:${site.phone}` : undefined;
  return (
    <div className="container-x py-10">
      <h1 className="section-title mb-6">{t("all_vehicles")}</h1>
      <Suspense fallback={<p>{t("loading")}</p>}>
        <VehicleFinder
          mode="list"
          options={options}
          contactHref={contactHref}
          categories={cats.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, icon: c.icon, iconMediaId: c.iconMediaId, count: counts[c.id] ?? 0 }))}
        />
      </Suspense>
    </div>
  );
}
