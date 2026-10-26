import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { getSiteSettings, whatsappLink } from "@/lib/settings";
import { makeT, pick } from "@/lib/i18n";
import ContactForm from "@/components/ContactForm";
import GoogleReviewsLink from "@/components/GoogleReviewsLink";
import { safeHref } from "@/lib/sanitize";
import { I } from "@/components/Icon";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: makeT(lang)("nav_contact") };
}

export default async function ContactPage() {
  const [lang, site] = await Promise.all([getLang(), getSiteSettings()]);
  const t = makeT(lang);
  const address = pick(lang, site.addressAr, site.addressEn);
  const hours = pick(lang, site.hoursAr, site.hoursEn);
  return (
    <div className="container-x py-12">
      <h1 className="section-title">{t("contact_title")}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {site.phone && <a href={`tel:${site.phone}`} className="card flex items-center gap-3 p-4 transition hover:border-primary"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><I.phone className="h-5 w-5" /></span><span dir="ltr">{site.phone}</span></a>}
          {site.whatsapp && <a href={whatsappLink(site.whatsapp, "")} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-3 p-4 transition hover:border-primary"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#25D366]/15 text-[#1a9e4b]"><I.whatsapp className="h-5 w-5" /></span><span>{t("whatsapp")} — <span dir="ltr">{site.whatsapp}</span></span></a>}
          {site.email && <a href={`mailto:${site.email}`} className="card flex items-center gap-3 p-4 transition hover:border-primary"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><I.mail className="h-5 w-5" /></span>{site.email}</a>}
          {address && <div className="card flex items-start gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><I.pin className="h-5 w-5" /></span><div><div className="text-xs text-gray-500">{t("address")}</div>{address}</div></div>}
          {hours && <div className="card flex items-start gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><I.clock className="h-5 w-5" /></span><div><div className="text-xs text-gray-500">{t("opening_hours")}</div><div className="whitespace-pre-line">{hours}</div></div></div>}
          <GoogleReviewsLink url={site.googleReviewsUrl} lang={lang} />
          {site.socialLinks.length > 0 && (
            <div className="card p-4">
              <div className="mb-3 font-semibold text-gray-900">{t("our_pages")}</div>
              <div className="flex flex-wrap gap-2">
                {site.socialLinks.filter((s) => safeHref(s.url)).map((s, i) => (
                  <a key={i} href={safeHref(s.url)!} target="_blank" rel="noopener noreferrer" className="chip chip-off">{s.icon ? <span>{s.icon}</span> : null}{s.label}</a>
                ))}
              </div>
            </div>
          )}
          {safeHref(site.mapUrl) && (
            <div className="card overflow-hidden">
              <iframe src={safeHref(site.mapUrl)!} title="Map" className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          )}
          {!site.phone && !site.whatsapp && !site.email && !address && (
            <p className="text-gray-500">{lang === "ar" ? "لم يتم إعداد بيانات التواصل بعد." : "Contact details have not been configured yet."}</p>
          )}
        </div>
        <div className="card p-6 lg:col-span-3">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
