import type { Metadata } from "next";
import { getT } from "@/lib/lang";
import { Finder } from "./Finder";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.nav.finder };
}

export default async function FinderPage({ searchParams }: { searchParams: Promise<{ q?: string; via?: string }> }) {
  const [{ q, via }, { lang }] = await Promise.all([searchParams, getT()]);
  return <Finder lang={lang} initialQuery={q?.slice(0, 1000)} initialVia={via === "VOICE" ? "VOICE" : "AI_TEXT"} />;
}
