import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { NewSchemeForm } from "./NewSchemeForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.meta.newScheme };
}

export default async function NewScheme() {
  await requireAdmin();
  const { lang, t } = await getT();
  const a = t.admin.newScheme;
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-[1.75rem]">{a.title}</h1>
        <p className="text-muted">{a.lead}</p>
      </div>
      <NewSchemeForm lang={lang} />
    </div>
  );
}
