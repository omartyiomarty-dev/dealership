import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { makeT } from "@/lib/i18n";
import { I } from "@/components/Icon";

export default async function NotFound() {
  const lang = await getLang();
  const t = makeT(lang);
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-gray-300"><I.car className="h-9 w-9" /></span>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">404 — {t("not_found_title")}</h1>
        <p className="mt-2 text-gray-600">{t("not_found_text")}</p>
        <Link href="/" className="btn-primary mt-6">{t("go_home")}</Link>
      </div>
    </div>
  );
}
