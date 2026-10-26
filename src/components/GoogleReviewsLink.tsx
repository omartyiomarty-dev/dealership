import { I } from "./Icon";
import { safeHref } from "@/lib/sanitize";
import { makeT, type Lang } from "@/lib/i18n";

/**
 * Link to the dealership's Google reviews (set by the admin in
 * Dealership Info). Renders nothing when the link is empty or not http(s).
 * No ratings or review counts are shown — we never invent review data.
 */
export default function GoogleReviewsLink({
  url,
  lang,
  variant = "card",
}: {
  url: string | null | undefined;
  lang: Lang;
  variant?: "card" | "chip" | "button" | "dark";
}) {
  const href = safeHref(url);
  if (!href) return null;
  const t = makeT(lang);
  const stars = (
    <span className="flex text-amber-500" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => <I.star key={i} className="h-3.5 w-3.5" />)}
    </span>
  );
  const common = { href, target: "_blank", rel: "noopener noreferrer" } as const;

  if (variant === "chip") {
    return <a {...common} className="chip chip-off">{stars}<span>{t("google_reviews")}</span></a>;
  }
  if (variant === "button") {
    return <a {...common} className="btn-outline">{stars}<span>{t("google_reviews")}</span></a>;
  }
  if (variant === "dark") {
    return <a {...common} className="inline-flex items-center gap-2 hover:text-white">{stars}<span>{t("google_reviews")}</span></a>;
  }
  return (
    <a {...common} className="card flex items-center gap-3 p-4 transition hover:border-primary">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-500"><I.star className="h-5 w-5" /></span>
      <span>
        <span className="block font-semibold text-gray-900">{t("google_reviews")}</span>
        <span className="text-sm text-gray-500">{t("google_reviews_cta")}</span>
      </span>
    </a>
  );
}
