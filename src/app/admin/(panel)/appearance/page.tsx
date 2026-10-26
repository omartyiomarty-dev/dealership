import { getSiteSettings } from "@/lib/settings";
import SiteSettingsForm from "../settings/SiteSettingsForm";
export default async function AppearancePage() {
  const s = await getSiteSettings();
  return <SiteSettingsForm initial={s} mode="appearance" />;
}
