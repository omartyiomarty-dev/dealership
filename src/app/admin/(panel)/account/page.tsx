import { db } from "@/db";
import { admins } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import AccountForms from "./AccountForms";

export default async function AccountPage() {
  const me = await requireAdmin();
  const list = me.isPrimary ? await db.select({ id: admins.id, name: admins.name, email: admins.email, isPrimary: admins.isPrimary, createdAt: admins.createdAt }).from(admins).orderBy(asc(admins.id)) : [];
  return <AccountForms me={me} admins={list} />;
}
