"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setLang(lang: "ar" | "en") {
  const c = await cookies();
  c.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
