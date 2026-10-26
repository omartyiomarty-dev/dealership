"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "./LangProvider";
import LangSwitch from "./LangSwitch";
import { I } from "./Icon";

type Props = { name: string; logoUrl: string | null; phone: string; whatsappUrl: string | null };

export default function Header({ name, logoUrl, phone, whatsappUrl }: Props) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const links = [
    { href: "/", label: t("nav_home") },
    { href: "/vehicles", label: t("nav_vehicles") },
    { href: "/choose", label: t("nav_choose"), highlight: true },
    { href: "/services", label: t("nav_services") },
    { href: "/about", label: t("nav_about") },
    { href: "/contact", label: t("nav_contact") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="h-10 w-auto object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white" aria-hidden><I.car className="h-5 w-5" /></span>
          )}
          <span className="hidden sm:inline">{name}</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                l.highlight
                  ? "bg-primary/10 text-primary-dark hover:bg-primary/20"
                  : path === l.href
                    ? "text-primary"
                    : "text-gray-700 hover:text-primary"
              }`}
            >
              {l.highlight && <I.sparkle className="me-1 h-3.5 w-3.5 text-primary" />}
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {phone && (
            <a href={`tel:${phone}`} className="btn-primary hidden md:inline-flex">
              <I.phone className="h-4 w-4" /> {t("call_now")}
            </a>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-outline hidden md:inline-flex">
              <I.whatsapp className="h-4 w-4" /> {t("whatsapp")}
            </a>
          )}
          <LangSwitch />
          <button
            type="button"
            className="rounded-lg border border-gray-300 p-2 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? t("close") : t("menu")}
            aria-expanded={open}
          >
            <span className="block h-0.5 w-5 bg-gray-800" />
            <span className="mt-1 block h-0.5 w-5 bg-gray-800" />
            <span className="mt-1 block h-0.5 w-5 bg-gray-800" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-gray-200 bg-white lg:hidden animate-fade-in">
          <nav className="container-x flex flex-col py-2" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-3 text-sm font-medium ${l.highlight ? "bg-primary/10 text-primary-dark" : "text-gray-700"}`}
              >
                {l.highlight && <I.sparkle className="me-1 inline h-3.5 w-3.5 text-primary" />}
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 px-3 py-3">
              {phone && (
                <a href={`tel:${phone}`} className="btn-primary flex-1">
                  <I.phone className="h-4 w-4" /> {t("call_now")}
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-outline flex-1">
                  <I.whatsapp className="h-4 w-4" /> {t("whatsapp")}
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
