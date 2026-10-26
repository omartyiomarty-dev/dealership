import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { getPolicySettings } from "@/lib/settings";
import { makeT, pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: makeT(lang)("nav_terms") };
}

export default async function TermsPage() {
  const [lang, p] = await Promise.all([getLang(), getPolicySettings()]);
  const t = makeT(lang);
  const body = pick(lang, p.termsAr, p.termsEn);
  return (
    <div className="container-x py-12">
      <h1 className="section-title">{t("nav_terms")}</h1>
      <div className="prose-basic mt-6 max-w-3xl whitespace-pre-line text-gray-700">{body || (lang === "ar" ? "لم يتم نشر الشروط والأحكام بعد." : "Terms and conditions have not been published yet.")}</div>
    </div>
  );
}
