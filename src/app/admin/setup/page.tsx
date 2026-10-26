import { redirect } from "next/navigation";
import { adminCount } from "@/lib/auth";
import { getLang } from "@/lib/lang-server";
import { ensureSchema } from "@/db/bootstrap";
import SetupForm from "./SetupForm";

export const metadata = { title: "Setup", robots: { index: false, follow: false } };

export default async function SetupPage() {
  await ensureSchema(); // first visit on a fresh database creates the tables
  if ((await adminCount()) > 0) redirect("/admin/login");
  const lang = await getLang();
  return <SetupForm lang={lang} />;
}
