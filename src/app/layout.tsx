import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getLang } from "@/lib/lang-server";
import { getSiteSettings, getSeoSettings, mediaUrl } from "@/lib/settings";
import { LangProvider } from "@/components/LangProvider";
import { pick } from "@/lib/i18n";
import { toCssValue } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [lang, site, seo] = await Promise.all([getLang(), getSiteSettings(), getSeoSettings()]);
  const name = pick(lang, site.nameAr, site.nameEn);
  const title = pick(lang, seo.siteTitleAr, seo.siteTitleEn) || name;
  const description = pick(lang, seo.descriptionAr, seo.descriptionEn) || pick(lang, site.taglineAr, site.taglineEn) || name;
  const og = mediaUrl(seo.ogImageMediaId);
  return {
    title: { default: title, template: `%s | ${name}` },
    description,
    metadataBase: seo.siteUrl ? new URL(seo.siteUrl) : undefined,
    openGraph: { title, description, siteName: name, locale: lang === "ar" ? "ar_EG" : "en_US", type: "website", images: og ? [og] : undefined },
    icons: site.logoMediaId ? { icon: mediaUrl(site.logoMediaId)! } : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [lang, site] = await Promise.all([getLang(), getSiteSettings()]);
  const th = site.theme;
  // Theme colours come from admin settings, so they are escaped before entering CSS.
  const vars = `:root{--primary:${toCssValue(th.primary)};--primary-dark:${toCssValue(th.primaryDark)};--accent:${toCssValue(th.accent)};--dark:${toCssValue(th.dark)};}`;
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <head>
        {/* Fonts are loaded asynchronously so they never block first paint. The
            system-font stack below renders instantly and is swapped once ready.
            A tiny inline script flips media="print" to "all" because event
            handlers are not allowed on Server Components. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: this IS the root layout, so the fonts apply site-wide */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          media="print"
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-page-custom-font -- root layout in App Router */}
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" />
        </noscript>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('DOMContentLoaded',function(){var l=document.querySelectorAll('link[rel="stylesheet"][media="print"]');for(var i=0;i<l.length;i++)l[i].media='all';});`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: vars }} />
      </head>
      <body className="min-h-screen bg-white text-gray-800">
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
