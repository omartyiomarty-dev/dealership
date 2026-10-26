import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getLang } from "@/lib/lang-server";
import { getSiteSettings, mediaUrl, whatsappLink } from "@/lib/settings";
import { pick } from "@/lib/i18n";
import { I } from "@/components/Icon";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [lang, site] = await Promise.all([getLang(), getSiteSettings()]);
  const name = pick(lang, site.nameAr, site.nameEn);
  return (
    <>
      <Header name={name} logoUrl={mediaUrl(site.logoMediaId)} phone={site.phone} whatsappUrl={site.whatsapp ? whatsappLink(site.whatsapp, "") : null} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer lang={lang} site={site} />
      {site.whatsapp && (
        <a
          href={whatsappLink(site.whatsapp, "")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="fixed bottom-5 end-5 z-30 grid h-13 w-13 place-items-center rounded-full bg-[#25D366] p-3.5 text-white shadow-lg transition hover:brightness-95"
        >
          <I.whatsapp className="h-6 w-6" />
        </a>
      )}
    </>
  );
}
