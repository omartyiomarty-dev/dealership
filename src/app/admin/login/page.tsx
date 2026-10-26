import { redirect } from "next/navigation";
import { adminCount, getCurrentAdmin } from "@/lib/auth";
import { getLang } from "@/lib/lang-server";
import { ensureSchema } from "@/db/bootstrap";
import LoginForm from "./LoginForm";

export const metadata = { title: "Login", robots: { index: false, follow: false } };

export default async function LoginPage() {
  await ensureSchema(); // first visit on a fresh database creates the tables
  if (await getCurrentAdmin()) redirect("/admin");
  if ((await adminCount()) === 0) redirect("/admin/setup");
  const lang = await getLang();
  return <LoginForm lang={lang} />;
}
