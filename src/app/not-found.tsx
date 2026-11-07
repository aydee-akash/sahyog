import Link from "next/link";
import { SearchX } from "lucide-react";
import { getT } from "@/lib/lang";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto grid max-w-md justify-items-start gap-4 py-12">
      <SearchX className="size-10 text-accent" aria-hidden />
      <h1 className="text-2xl font-bold">{t.common.notFound}</h1>
      <p className="text-muted">{t.common.notFoundLead}</p>
      <Link href="/" className="btn-primary">{t.common.goHome}</Link>
    </div>
  );
}
