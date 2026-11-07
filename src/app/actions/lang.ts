"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE } from "@/lib/i18n";

export async function setLang(form: FormData) {
  const lang = form.get("lang") === "en" ? "en" : "hi";
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
