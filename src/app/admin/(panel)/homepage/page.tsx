import { getHomeSettings } from "@/lib/settings";
import HomeForm from "./HomeForm";
export default async function HomepageAdmin() {
  const h = await getHomeSettings();
  return <HomeForm initial={h} />;
}
