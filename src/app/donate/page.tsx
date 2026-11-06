import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DonateIndex() {
  const c = await prisma.campaign.findFirst({ where: { active: true }, orderBy: { slug: "desc" } });
  redirect(c ? `/donate/${c.slug}` : "/");
}
