import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getSiteSettings, getHomeSettings, mediaUrl, whatsappLink } from "@/lib/settings";
import { makeT, pick } from "@/lib/i18n";
import { searchVehicles, getPublicCategories, getCategoryCounts } from "@/lib/vehicles";
import VehicleCard from "@/components/VehicleCard";
import { db } from "@/db";
import { services } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import ContactForm from "@/components/ContactForm";
import { I } from "@/components/Icon";
import DbDown from "@/components/DbDown";
import GoogleReviewsLink from "@/components/GoogleReviewsLink";

// Inventory changes (sold/rented/new) must be reflected immediately.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const lang = await getLang();
  let site, home;
  try {
    [site, home] = await Promise.all([getSiteSettings(), getHomeSettings()]);
  } catch {
    return <DbDown note="home" />;
  }
  const t = makeT(lang);
  const visible = (k: string) => home.sections.find((s) => s.key === k)?.visible !== false;
  const [featured, recent, cats, counts, svc] = await Promise.all([
    visible("featured") ? searchVehicles({ featured: true, perPage: home.featuredLimit || 6 }) : null,
    visible("recent") ? searchVehicles({ perPage: home.recentLimit || 8 }) : null,
    visible("categories") ? getPublicCategories() : [],
    visible("categories") ? getCategoryCounts() : ({} as Record<number, number>),
    visible("services") ? db.select().from(services).where(eq(services.published, true)).orderBy(asc(services.sortOrder)) : [],
  ]);
  const name = pick(lang, site.nameAr, site.nameEn);
  const heroTitle = pick(lang, home.heroTitleAr, home.heroTitleEn) || t("hero_default_title");
  const heroText = pick(lang, home.heroTextAr, home.heroTextEn) || t("hero_default_subtitle");
  const heroImg = mediaUrl(site.heroMediaId);
  const contactHref = site.whatsapp ? whatsappLink(site.whatsapp, "") : site.phone ? `tel:${site.phone}` : undefined;
  const homeCats = cats.filter((c) => c.showOnHome);

  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section key="hero" className="relative overflow-hidden bg-gray-900 text-white">
        {heroImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-900/70 to-gray-900/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-primary-dark hero-pattern" />
        )}
        <div className="container-x relative py-20 md:py-28">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="text-3xl font-extrabold leading-tight text-white drop-shadow md:text-5xl">{heroTitle}</h1>
            <p className="mt-4 text-lg text-gray-100 drop-shadow">{heroText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/vehicles" className="btn-primary px-6 py-3 text-base"><I.search className="h-4 w-4" /> {t("search_vehicles")}</Link>
              <Link href="/choose" className="btn bg-white px-6 py-3 text-base text-gray-900 hover:bg-gray-100"><I.sparkle className="h-4 w-4 text-primary" /> {t("nav_choose")}</Link>
            </div>
            <form action="/vehicles" className="mt-8 flex max-w-xl gap-2 rounded-xl bg-white/95 p-2 shadow-lg">
              <input name="q" className="min-w-0 flex-1 rounded-lg px-3 py-2 text-gray-900 outline-none" placeholder={lang === "ar" ? "ابحث: تويوتا، هوندا، موتوسيكل، 2015..." : "Search: Toyota, Honda, motorcycle, 2015..."} aria-label={t("search_vehicles")} />
              <button className="btn-primary shrink-0">{t("search_vehicles")}</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {site.phone && <a href={`tel:${site.phone}`} className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20" dir="ltr"><I.phone className="inline h-4 w-4" /> {site.phone}</a>}
              {site.whatsapp && <a href={whatsappLink(site.whatsapp, "")} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#25D366]/90 px-4 py-2 hover:bg-[#25D366]"><I.whatsapp className="inline h-4 w-4" /> {t("whatsapp")}</a>}
            </div>
          </div>
        </div>
      </section>
    ),
    choose: (
      <section key="choose" className="container-x -mt-8 relative z-10">
        <div className="card flex flex-col items-start gap-4 border-primary/30 bg-gradient-to-r from-primary/10 to-white p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 md:text-2xl"><I.sparkle className="h-4 w-4 shrink-0 text-primary" /> {pick(lang, home.chooseTitleAr, home.chooseTitleEn) || t("choose_cta_title")}</h2>
            <p className="mt-1 text-gray-600">{pick(lang, home.chooseTextAr, home.chooseTextEn) || t("choose_cta_text")}</p>
          </div>
          <Link href="/choose" className="btn-primary shrink-0 px-6 py-3">{t("start_now")} <I.arrowLeft className="h-4 w-4 rtl:-scale-x-100" /></Link>
        </div>
      </section>
    ),
    featured: featured && (
      <section key="featured" className="container-x py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="section-title">{t("featured_vehicles")}</h2>
          <Link href="/vehicles" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("view_all")} <I.arrowLeft className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 rtl:-scale-x-100" /></Link>
        </div>
        {featured.items.length === 0 ? <Empty t={t} /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.map((v) => <VehicleCard key={v.id} v={v} lang={lang} contactHref={contactHref} />)}
          </div>
        )}
      </section>
    ),
    categories: (
      <section key="categories" className="bg-gray-50 py-14">
        <div className="container-x">
          <h2 className="section-title mb-6">{t("categories_title")}</h2>
          {homeCats.length === 0 ? <p className="text-gray-500">{t("no_categories")}</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {homeCats.map((c) => (
                <Link key={c.id} href={`/choose?cat=${c.id}`} className="card flex items-center gap-3 p-4 transition hover:border-primary hover:shadow-md">
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-2xl">
                    {c.iconMediaId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(c.iconMediaId)!} alt="" className="h-full w-full object-cover" />
                    ) : <I.tag className="h-5 w-5 text-primary" />}
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900">{pick(lang, c.nameAr, c.nameEn)}</span>
                    <span className="text-xs text-gray-500">{counts[c.id] ?? 0} {lang === "ar" ? "مركبة" : "vehicles"}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    ),
    recent: recent && (
      <section key="recent" className="container-x py-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="section-title">{t("recent_vehicles")}</h2>
          <Link href="/vehicles" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("view_all")} <I.arrowLeft className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 rtl:-scale-x-100" /></Link>
        </div>
        {recent.items.length === 0 ? <Empty t={t} /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.items.map((v) => <VehicleCard key={v.id} v={v} lang={lang} contactHref={contactHref} />)}
          </div>
        )}
      </section>
    ),
    services: (
      <section key="services" className="bg-gray-50 py-14">
        <div className="container-x">
          <h2 className="section-title mb-6">{t("services_title")}</h2>
          {svc.length === 0 ? <p className="text-gray-500">{t("no_services")}</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {svc.map((s) => (
                <div key={s.id} className="card p-5">
                  <div className="text-3xl">{s.icon || <I.wrench className="h-8 w-8 text-primary" />}</div>
                  <h3 className="mt-3 font-bold text-gray-900">{pick(lang, s.titleAr, s.titleEn)}</h3>
                  <p className="mt-1 text-sm text-gray-600">{pick(lang, s.descriptionAr, s.descriptionEn)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    ),
    about: (pick(lang, site.aboutAr, site.aboutEn) ? (
      <section key="about" className="container-x py-14">
        <h2 className="section-title mb-4">{t("about_title")} — {name}</h2>
        <p className="max-w-3xl whitespace-pre-line leading-relaxed text-gray-700">{pick(lang, site.aboutAr, site.aboutEn)}</p>
        <Link href="/about" className="group mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("nav_about")} <I.arrowLeft className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 rtl:-scale-x-100" /></Link>
      </section>
    ) : null),
    contact: (
      <section key="contact" className="bg-gray-900 py-14 text-white">
        <div className="container-x grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{t("contact_title")}</h2>
            <ul className="mt-5 space-y-3 text-gray-200">
              {site.phone && <li><a href={`tel:${site.phone}`} dir="ltr" className="hover:text-primary"><I.phone className="inline h-4 w-4" /> {site.phone}</a></li>}
              {site.whatsapp && <li><a href={whatsappLink(site.whatsapp, "")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white" dir="ltr"><I.whatsapp className="h-4 w-4" /> {site.whatsapp}</a></li>}
              {site.email && <li className="flex items-center gap-2"><I.mail className="h-4 w-4" /> {site.email}</li>}
              {pick(lang, site.addressAr, site.addressEn) && <li className="flex items-start gap-2"><I.pin className="mt-0.5 h-4 w-4 shrink-0" /> {pick(lang, site.addressAr, site.addressEn)}</li>}
              {pick(lang, site.hoursAr, site.hoursEn) && <li className="flex items-start gap-2"><I.clock className="mt-0.5 h-4 w-4 shrink-0" /> {pick(lang, site.hoursAr, site.hoursEn)}</li>}
              {site.googleReviewsUrl && <li><GoogleReviewsLink url={site.googleReviewsUrl} lang={lang} variant="dark" /></li>}
            </ul>
          </div>
          <div className="card p-5 text-gray-800"><ContactForm /></div>
        </div>
      </section>
    ),
  };

  return <>{home.sections.filter((s) => s.visible !== false).map((s) => sections[s.key] ?? null)}</>;
}

function Empty({ t }: { t: (k: "no_vehicles" | "no_vehicles_hint") => string }) {
  return (
    <div className="card p-12 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gray-100 text-gray-300"><I.car className="h-8 w-8" /></span>
      <p className="mt-3 font-semibold text-gray-800">{t("no_vehicles")}</p>
      <p className="text-sm text-gray-500">{t("no_vehicles_hint")}</p>
    </div>
  );
}
