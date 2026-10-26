import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(inquiries).where(eq(inquiries.status, "new"));
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminNav name={admin.name} newInquiries={c} />
      <main className="min-w-0 flex-1 p-4 pt-20 lg:p-8 lg:pt-8">{children}</main>
    </div>
  );
}
