import { getSeoSettings } from "@/lib/settings";
import SeoForm from "./SeoForm";
export default async function SeoPage() {
  const s = await getSeoSettings();
  return <SeoForm initial={s} />;
}
