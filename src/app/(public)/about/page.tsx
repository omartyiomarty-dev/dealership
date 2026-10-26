import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { getSiteSettings } from "@/lib/settings";
import { makeT, pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: makeT(lang)("nav_about") };
}

export default async function AboutPage() {
  const [lang, site] = await Promise.all([getLang(), getSiteSettings()]);
  const t = makeT(lang);
  const about = pick(lang, site.aboutAr, site.aboutEn);
  return (
    <div className="container-x py-12">
      <h1 className="section-title">{t("about_title")} — {pick(lang, site.nameAr, site.nameEn)}</h1>
      {about ? (
        <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-gray-700">{about}</p>
      ) : (
        <p className="mt-6 text-gray-500">{lang === "ar" ? "لم تتم إضافة نبذة عن المعرض بعد." : "About information has not been added yet."}</p>
      )}
    </div>
  );
}
