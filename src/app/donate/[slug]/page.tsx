import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { DonateFlow } from "./DonateFlow";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await prisma.campaign.findUnique({ where: { slug: (await params).slug } });
  return { title: c ? `दान: ${c.titleHi}` : "दान" };
}

export default async function DonatePage({ params }: { params: Params }) {
  const { slug } = await params;
  const [campaign, others, session] = await Promise.all([
    prisma.campaign.findFirst({ where: { slug, active: true } }),
    prisma.campaign.findMany({ where: { active: true, NOT: { slug } }, select: { slug: true, titleHi: true } }),
    getSession(),
  ]);
  if (!campaign) notFound();

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div className="grid gap-2">
        <p className="text-[0.95rem] text-muted">अभियान</p>
        <h1 className="text-[2rem] font-bold leading-tight">{campaign.titleHi}</h1>
        <p className="text-muted">{campaign.blurbHi}</p>
        {others.length > 0 && (
          <p className="text-[0.95rem]">
            दूसरा अभियान:{" "}
            {others.map((o) => (
              <Link key={o.slug} href={`/donate/${o.slug}`} className="text-accent underline">{o.titleHi}</Link>
            ))}
          </p>
        )}
      </div>
      <DonateFlow
        campaignSlug={campaign.slug}
        prefill={session?.role === "DONOR" ? { name: session.name, email: session.email } : undefined}
      />
    </div>
  );
}
