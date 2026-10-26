import { getSiteSettings } from "@/lib/settings";
import SiteSettingsForm from "./SiteSettingsForm";
export default async function SettingsPage() {
  const s = await getSiteSettings();
  return <SiteSettingsForm initial={s} mode="info" />;
}
