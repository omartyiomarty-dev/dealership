import type { Metadata } from "next";
import { Suspense } from "react";
import { getLang } from "@/lib/lang-server";
import { makeT, pick } from "@/lib/i18n";
import { getFilterOptions, getPublicCategories, getCategoryCounts } from "@/lib/vehicles";
import { getSiteSettings, getHomeSettings, whatsappLink } from "@/lib/settings";
import VehicleFinder from "@/components/VehicleFinder";
import DbDown from "@/components/DbDown";
import { I } from "@/components/Icon";

// Inventory changes (sold/rented/new) must be reflected immediately.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = makeT(lang);
  return { title: t("choose_title"), description: t("choose_subtitle") };
}

export default async function ChoosePage() {
  const lang = await getLang();
  let options, cats, counts, site, home;
  try {
    [options, cats, counts, site, home] = await Promise.all([getFilterOptions(), getPublicCategories(), getCategoryCounts(), getSiteSettings(), getHomeSettings()]);
  } catch {
    return <DbDown note="choose" />;
  }
  const t = makeT(lang);
  const contactHref = site.whatsapp ? whatsappLink(site.whatsapp, "") : site.phone ? `tel:${site.phone}` : undefined;
  return (
    <div>
      <div className="bg-gradient-to-br from-primary/15 via-white to-accent/10">
        <div className="container-x py-12 text-center">
          <h1 className="flex items-center justify-center gap-2.5 text-3xl font-extrabold text-gray-900 md:text-4xl"><I.sparkle className="h-5 w-5 text-primary" /> {pick(lang, home.chooseTitleAr, home.chooseTitleEn) || t("choose_title")}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">{pick(lang, home.chooseTextAr, home.chooseTextEn) || t("choose_subtitle")}</p>
        </div>
      </div>
      <div className="container-x py-8">
        <Suspense fallback={<p>{t("loading")}</p>}>
          <VehicleFinder
            mode="wizard"
            options={options}
            contactHref={contactHref}
            categories={cats.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, icon: c.icon, iconMediaId: c.iconMediaId, count: counts[c.id] ?? 0 }))}
          />
        </Suspense>
      </div>
    </div>
  );
}
