import { getPolicySettings } from "@/lib/settings";
import PoliciesForm from "./PoliciesForm";
export default async function PoliciesPage() {
  const s = await getPolicySettings();
  return <PoliciesForm initial={s} />;
}
