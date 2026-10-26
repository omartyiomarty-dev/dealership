"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/LangProvider";
import { pick } from "@/lib/i18n";
import { I, type IconName } from "@/components/Icon";
import LangSwitch from "@/components/LangSwitch";
import { logoutAction } from "@/app/admin/actions";

const items: { href: string; ar: string; en: string; icon: IconName }[] = [
  { href: "/admin", ar: "لوحة التحكم", en: "Dashboard", icon: "gauge" },
  { href: "/admin/vehicles", ar: "المركبات", en: "Vehicles", icon: "car" },
  { href: "/admin/vehicles/new", ar: "إضافة مركبة", en: "Add Vehicle", icon: "plus" },
  { href: "/admin/categories", ar: "الفئات", en: "Categories", icon: "tag" },
  { href: "/admin/brands", ar: "الماركات والموديلات", en: "Brands & Models", icon: "cog" },
  { href: "/admin/inquiries", ar: "الاستفسارات", en: "Inquiries", icon: "inbox" },
  { href: "/admin/sales", ar: "إحصائيات البيع", en: "Sales Analytics", icon: "star" },
  { href: "/admin/settings", ar: "بيانات المعرض", en: "Dealership Info", icon: "pin" },
  { href: "/admin/services", ar: "الخدمات", en: "Services", icon: "wrench" },
  { href: "/admin/media", ar: "مكتبة الصور", en: "Media Library", icon: "eye" },
  { href: "/admin/homepage", ar: "الصفحة الرئيسية", en: "Homepage", icon: "star" },
  { href: "/admin/appearance", ar: "المظهر والألوان", en: "Appearance", icon: "sparkle" },
  { href: "/admin/seo", ar: "إعدادات SEO", en: "SEO Settings", icon: "search" },
  { href: "/admin/policies", ar: "الخصوصية والشروط", en: "Privacy & Terms", icon: "mail" },
  { href: "/admin/account", ar: "الحساب والأمان", en: "Account & Security", icon: "users" },
];

export default function AdminNav({ name, newInquiries }: { name: string; newInquiries: number }) {
  const { lang } = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((item) => {
        const IconC = I[item.icon];
        const i = item;
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href) && !(i.href === "/admin/vehicles" && path.startsWith("/admin/vehicles/new"));
        return (
          <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? "bg-primary text-white" : "text-gray-200 hover:bg-white/10"}`}>
            <IconC className="h-4 w-4 shrink-0 opacity-90" />
            <span className="flex-1">{pick(lang, i.ar, i.en)}</span>
            {i.href === "/admin/inquiries" && newInquiries > 0 && <span className="rounded-full bg-accent px-2 text-xs font-bold text-white">{newInquiries}</span>}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/10"><I.globe className="h-4 w-4 opacity-90" /> <span>{pick(lang, "معاينة الموقع", "Website Preview")}</span></a>
      <form action={logoutAction}>
        <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-white/10"><I.logout className="h-4 w-4" /> <span>{pick(lang, "تسجيل الخروج", "Logout")}</span></button>
      </form>
    </nav>
  );
  return (
    <>
      <aside className="hidden w-64 shrink-0 bg-gray-900 text-white lg:block">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2 font-bold"><I.cog className="h-4 w-4 text-primary" /> {pick(lang, "لوحة الإدارة", "Admin Panel")}</div>
          <div className="mt-1 truncate text-xs text-gray-400">{name}</div>
          <div className="mt-2"><LangSwitch className="!border-white/30 !text-white" /></div>
        </div>
        {nav}
      </aside>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-gray-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2 font-bold"><I.cog className="h-4 w-4 text-primary" /> {pick(lang, "لوحة الإدارة", "Admin")}</div>
        <div className="flex items-center gap-2">
          <LangSwitch className="!border-white/30 !text-white" />
          <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-lg border border-white/30 px-3 py-1.5" aria-label="Menu" aria-expanded={open}><span className="block h-0.5 w-5 bg-white" /><span className="mt-1 block h-0.5 w-5 bg-white" /><span className="mt-1 block h-0.5 w-5 bg-white" /></button>
        </div>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-gray-900/95 pt-14 text-white lg:hidden overflow-y-auto">{nav}</div>}
    </>
  );
}
