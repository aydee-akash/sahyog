import { cookies } from "next/headers";
import { DICTS, LANG_COOKIE, Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "hi";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: DICTS[lang] };
}
