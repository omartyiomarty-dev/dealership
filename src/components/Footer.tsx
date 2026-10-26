import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { makeT, pick } from "@/lib/i18n";
import type { SiteSettings } from "@/lib/settings";
import { I } from "./Icon";
import GoogleReviewsLink from "./GoogleReviewsLink";
import { safeHref } from "@/lib/sanitize";

export default function Footer({ lang, site }: { lang: Lang; site: SiteSettings }) {
  const t = makeT(lang);
  const name = pick(lang, site.nameAr, site.nameEn);
  const address = pick(lang, site.addressAr, site.addressEn);
  const hours = pick(lang, site.hoursAr, site.hoursEn);
  const footer = pick(lang, site.footerAr, site.footerEn);
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">
      <div className="container-x grid gap-8 py-12 md:grid-cols-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          {footer && <p className="mt-2 text-sm leading-relaxed text-gray-600">{footer}</p>}
          {!footer && pick(lang, site.taglineAr, site.taglineEn) && (
            <p className="mt-2 text-sm text-gray-600">{pick(lang, site.taglineAr, site.taglineEn)}</p>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{t("quick_links")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li><Link className="hover:text-primary" href="/vehicles">{t("nav_vehicles")}</Link></li>
            <li><Link className="hover:text-primary font-semibold text-primary-dark" href="/choose">{t("nav_choose")}</Link></li>
            <li><Link className="hover:text-primary" href="/services">{t("nav_services")}</Link></li>
            <li><Link className="hover:text-primary" href="/about">{t("nav_about")}</Link></li>
            <li><Link className="hover:text-primary" href="/contact">{t("nav_contact")}</Link></li>
            <li><Link className="hover:text-primary" href="/privacy">{t("nav_privacy")}</Link></li>
            <li><Link className="hover:text-primary" href="/terms">{t("nav_terms")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{t("contact_title")}</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {site.phone && <li><a dir="ltr" className="inline-flex items-center gap-1.5 hover:text-primary" href={`tel:${site.phone}`}><I.phone className="h-4 w-4" /> {site.phone}</a></li>}
            {site.email && <li><a className="inline-flex items-center gap-1.5 hover:text-primary" href={`mailto:${site.email}`}><I.mail className="h-4 w-4" /> {site.email}</a></li>}
            {address && <li className="flex items-start gap-1.5"><I.pin className="mt-0.5 h-4 w-4 shrink-0" /> {address}</li>}
            {hours && <li className="flex items-start gap-1.5"><I.clock className="mt-0.5 h-4 w-4 shrink-0" /> {hours}</li>}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{t("follow_us")}</h4>
          {site.socialLinks.length === 0 && !safeHref(site.googleReviewsUrl) ? (
            <p className="mt-3 text-sm text-gray-500">—</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {safeHref(site.googleReviewsUrl) && (
                <li><GoogleReviewsLink url={site.googleReviewsUrl} lang={lang} variant="chip" /></li>
              )}
              {site.socialLinks.filter((s) => safeHref(s.url)).map((s, i) => (
                <li key={i}>
                  <a href={safeHref(s.url)!} target="_blank" rel="noopener noreferrer" className="chip chip-off">
                    {s.icon ? <span>{s.icon}</span> : null}
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {name}. {t("rights")}
      </div>
    </footer>
  );
}
