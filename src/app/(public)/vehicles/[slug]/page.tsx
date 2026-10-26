import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getLang } from "@/lib/lang-server";
import { makeT, pick, formatPrice, rentalSuffix, formatNumber, enumLabel } from "@/lib/i18n";
import { getVehicleBySlug, searchVehiclesPublic } from "@/lib/vehicles";
import { getSiteSettings, getSeoSettings, mediaUrl, whatsappLink } from "@/lib/settings";
import Gallery from "@/components/Gallery";
import ShareButton from "@/components/ShareButton";
import ContactForm from "@/components/ContactForm";
import VehicleCard from "@/components/VehicleCard";
import { I } from "@/components/Icon";
import { toJsonLdString } from "@/lib/sanitize";
import { getRecommendedFor } from "@/lib/sales";
import DbDown from "@/components/DbDown";
import GoogleReviewsLink from "@/components/GoogleReviewsLink";

// Availability changes (sold/rented) must appear immediately, and a page that
// was briefly missing must not stay cached as a 404.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [lang, v, seo] = await Promise.all([getLang(), getVehicleBySlug(slug), getSeoSettings()]);
  if (!v) return {};
  const title = v.seoTitle || pick(lang, v.titleAr, v.titleEn);
  const description = v.seoDescription || pick(lang, v.descriptionAr, v.descriptionEn)?.slice(0, 160) || `${v.make} ${v.model} ${v.year}`;
  const img = mediaUrl(v.mainImageId);
  const canonical = seo.siteUrl ? `${seo.siteUrl.replace(/\/$/, "")}/vehicles/${v.slug}` : undefined;
  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: { title, description, type: "website", images: img ? [img] : undefined, url: canonical },
  };
}

export default async function VehicleDetailsPage({ params }: Props) {
  const { slug } = await params;
  const lang = await getLang();
  let v, site, seo;
  let alternatives: Awaited<ReturnType<typeof getRecommendedFor>> = [];
  try {
    [v, site, seo] = await Promise.all([getVehicleBySlug(slug), getSiteSettings(), getSeoSettings()]);
  } catch {
    return <DbDown note="detail" />;
  }
  if (!v) notFound();
  // When a vehicle is sold/rented we show what the customer can have instead.
  const unavailable = v.availability === "sold" || v.availability === "rented";
  try {
    alternatives = unavailable ? await getRecommendedFor(v.id, v.vehicleType, 3) : [];
  } catch {
    alternatives = [];
  }
  const t = makeT(lang);
  const title = pick(lang, v.titleAr, v.titleEn);
  const isRent = v.transactionType === "rent";
  const price = formatPrice(lang, v.price);
  const deposit = formatPrice(lang, v.rentalDeposit);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = seo.siteUrl ? seo.siteUrl.replace(/\/$/, "") : host ? `${proto}://${host}` : "";
  const url = `${base}/vehicles/${v.slug}`;
  const waText = `${t("whatsapp_msg")} ${title} (#${v.stockNumber})\n${url}`;
  let related = await searchVehiclesPublic({ tx: v.transactionType as "sale" | "rent", make: v.make, types: [v.vehicleType], perPage: 4 });
  if (related.items.filter((r) => r.id !== v.id).length === 0) related = await searchVehiclesPublic({ tx: v.transactionType as "sale" | "rent", types: [v.vehicleType], perPage: 4 });
  const relatedItems = related.items.filter((r) => r.id !== v.id).slice(0, 3);
  const features = lang === "ar" ? v.featuresAr : v.featuresEn;
  const desc = pick(lang, v.descriptionAr, v.descriptionEn);
  const rentalCond = pick(lang, v.rentalConditionsAr, v.rentalConditionsEn);
  const installInfo = pick(lang, v.installmentInfoAr, v.installmentInfoEn);

  const specs: [string, string | null | undefined][] = [
    [t("stock_no"), v.stockNumber],
    [t("vehicle_type"), enumLabel(lang, v.vehicleType)],
    [t("make"), v.make],
    [t("model"), v.model],
    [t("trim"), v.trim],
    [t("year"), String(v.year)],
    [t("condition"), t(v.condition === "new" ? "new" : "used")],
    [t("mileage"), v.mileage != null ? `${formatNumber(lang, v.mileage)} ${t("km")}` : null],
    [t("transmission"), enumLabel(lang, v.transmission)],
    [t("fuel_type"), enumLabel(lang, v.fuelType)],
    [t("engine"), v.engineCapacity],
    [t("body_style"), v.bodyStyle],
    [t("exterior_color"), v.exteriorColor],
    [t("interior_color"), v.interiorColor],
    [t("location"), v.location],
    [t("availability"), enumLabel(lang, v.availability)],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": v.vehicleType === "motorcycle" || v.vehicleType === "scooter" ? "Motorcycle" : v.vehicleType === "car" ? "Car" : "Vehicle",
    name: title,
    brand: v.make,
    model: v.model,
    vehicleModelDate: String(v.year),
    sku: v.stockNumber,
    image: v.images.map((id) => `${base}${mediaUrl(id)}`),
    ...(v.price ? { offers: { "@type": "Offer", priceCurrency: "EGP", price: v.price, availability: v.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } } : {}),
  };

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdString(jsonLd) }} />
      <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary">{t("nav_home")}</Link> <span className="mx-1 text-gray-300">/</span> <Link href="/vehicles" className="hover:text-primary">{t("nav_vehicles")}</Link> <span className="mx-1 text-gray-300">/</span> <span className="text-gray-800">{title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Gallery images={v.images.map((id) => mediaUrl(id)!)} alt={title} />
          {desc && (
            <section className="mt-8">
              <h2 className="mb-2 text-xl font-bold text-gray-900">{t("description")}</h2>
              <p className="whitespace-pre-line leading-relaxed text-gray-700">{desc}</p>
            </section>
          )}
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-gray-900">{t("specifications")}</h2>
            <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 sm:grid-cols-2">
              {specs.filter(([, val]) => val).map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3 bg-white px-4 py-3 text-sm">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-semibold text-gray-900">{val}</dd>
                </div>
              ))}
            </dl>
          </section>
          {features.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold text-gray-900">{t("features")}</h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {features.map((f, i) => <li key={i} className="flex items-start gap-2 text-gray-700"><I.check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />{f}</li>)}
              </ul>
            </section>
          )}
        </div>
        <aside className="lg:col-span-2">
          <div className="card sticky top-20 p-5">
            {unavailable && (
              <div className={`mb-4 rounded-xl p-4 ${v.availability === "sold" ? "bg-gray-900 text-white" : "bg-accent/15 text-gray-900"}`}>
                <p className="font-bold">
                  {v.availability === "sold" ? t("this_sold") : t("this_rented")}
                </p>
                {v.soldAt && (
                  <p className="mt-0.5 text-sm opacity-90">
                    {(v.availability === "sold" ? t("sold_on") : t("rented_on"))}:{" "}
                    {new Date(v.soldAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}
                  </p>
                )}
                <Link href="/vehicles?availability=available" className="mt-2 inline-block text-sm underline">
                  {t("view_available")} →
                </Link>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <span className={`badge ${isRent ? "bg-accent text-white" : "bg-primary text-white"}`}>{isRent ? t("for_rent") : t("for_sale")}</span>
              <span className={`badge ${v.availability === "available" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"}`}>{enumLabel(lang, v.availability)}</span>
              <span className="badge bg-gray-100 text-gray-700" dir="ltr">#{v.stockNumber}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{v.make} {v.model} {v.trim ?? ""} · {v.year}</p>
            <p className="mt-4 text-3xl font-extrabold text-primary-dark">
              {price ? <>{price}{isRent && <span className="text-base font-medium text-gray-500"> {rentalSuffix(lang, v.rentalPeriod)}</span>}</> : <span className="text-xl text-gray-500">{t("price_on_request")}</span>}
            </p>
            {!isRent && v.installmentAvailable && (
              <div className="mt-2 rounded-lg bg-primary/10 p-3 text-sm text-primary-dark">
                <strong className="inline-flex items-center gap-1"><I.check className="h-3.5 w-3.5" /> {t("installment_available")}</strong>
                {installInfo && <p className="mt-1 whitespace-pre-line text-gray-700">{installInfo}</p>}
              </div>
            )}
            {isRent && (deposit || rentalCond) && (
              <div className="mt-2 rounded-lg bg-accent/10 p-3 text-sm text-gray-800">
                {deposit && <p><strong>{t("deposit")}:</strong> {deposit}</p>}
                {rentalCond && <p className="mt-1 whitespace-pre-line"><strong>{t("rental_conditions")}:</strong> {rentalCond}</p>}
              </div>
            )}
            {v.categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {v.categories.map((c) => (
                  <Link key={c.id} href={`/choose?cat=${c.id}`} className="badge bg-gray-100 text-gray-700 transition hover:bg-primary/10 hover:text-primary-dark">{c.icon ? <span className="me-0.5">{c.icon}</span> : null}{pick(lang, c.nameAr, c.nameEn)}</Link>
                ))}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {site.phone && <a href={`tel:${site.phone}`} className="btn-primary"><I.phone className="h-4 w-4" /> {t("call_now")}</a>}
              {site.whatsapp && <a href={whatsappLink(site.whatsapp, waText)} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95"><I.whatsapp className="h-4 w-4" /> {t("whatsapp")}</a>}
              <ShareButton title={title} />
              <GoogleReviewsLink url={site.googleReviewsUrl} lang={lang} variant="button" />
            </div>
            <div className="mt-6 border-t border-gray-200 pt-5">
              <ContactForm vehicleId={v.id} vehicleTitle={`${title} (#${v.stockNumber})`} transactionType={v.transactionType} />
            </div>
          </div>
        </aside>
      </div>
      {alternatives.length > 0 && (
        <section className="mt-14 rounded-2xl bg-gray-50 p-6">
          <h2 className="section-title mb-1">{t("alternatives")}</h2>
          <p className="mb-5 text-sm text-gray-600">
            {v.availability === "sold" ? t("this_sold") : t("this_rented")} — {t("recommendations")}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {alternatives.map((a) => <VehicleCard key={a.id} v={a} lang={lang} />)}
          </div>
        </section>
      )}
      {relatedItems.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title mb-6">{t("related_vehicles")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedItems.map((r) => <VehicleCard key={r.id} v={r} lang={lang} />)}
          </div>
        </section>
      )}
    </div>
  );
}
