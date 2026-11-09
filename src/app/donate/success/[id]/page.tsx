import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, MessageCircle, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { canViewReceipt } from "@/lib/receiptAccess";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/content";
import { CheckIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { addMonth } from "@/lib/dates";

export const metadata = { title: "धन्यवाद / Thank you" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

export default async function Success({ params, searchParams }: Props) {
  const [{ id }, { t: token }, { lang, t }, session] = await Promise.all([params, searchParams, getT(), getSession()]);
  const donation = await prisma.donation.findUnique({ where: { id }, include: { receipt: true, campaign: true } });
  if (!donation?.receipt || !(await canViewReceipt(donation, token))) notFound();

  const pdfHref = `/api/receipts/${donation.id}${token ? `?t=${encodeURIComponent(token)}` : ""}`;
  const campaignTitle = lang === "en" ? donation.campaign.titleEn : donation.campaign.titleHi;
  const share = lang === "en"
    ? `I just supported "${campaignTitle}". You can help too: ${process.env.APP_URL ?? ""}/donate/${donation.campaign.slug}`
    : `मैंने “${campaignTitle}” अभियान में दान किया। आप भी साथ दें: ${process.env.APP_URL ?? ""}/donate/${donation.campaign.slug}`;

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div className="fade-up grid justify-items-start gap-3">
        <span className="grid size-16 place-items-center rounded-full bg-ok-soft text-ok ring-8 ring-ok-soft/50">
          <CheckIcon className="size-9" />
        </span>
        <h1 className="text-[2rem] leading-tight">{t.success.thanks(donation.donorName.split(" ")[0])}</h1>
        <p className="text-lg text-muted">{t.success.received(formatINR(donation.amount), campaignTitle)}</p>
      </div>

      <div className="card grid gap-3 p-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted">{t.success.receiptNo}</dt>
          <dd className="font-semibold">{donation.receipt.number}</dd>
          <dt className="text-muted">{t.success.date}</dt>
          <dd>{formatDate(donation.receipt.issuedAt, lang)}</dd>
          <dt className="text-muted">PAN</dt>
          <dd>{donation.donorPan}</dd>
          {donation.frequency === "MONTHLY" && (
            <>
              <dt className="text-muted">{t.success.nextDebit}</dt>
              <dd>{formatDate(donation.nextChargeAt ?? addMonth(donation.receipt.issuedAt), lang)} {t.success.testMode}</dd>
            </>
          )}
        </dl>
        <a href={pdfHref} target="_blank" rel="noopener" className="btn-primary mt-2">
          <Download className="size-5" aria-hidden /> {t.success.pdf}
        </a>
        <p className="text-[0.9rem] text-muted">{t.success.emailed(donation.donorEmail)}</p>
      </div>

      {!session && (
        <Link prefetch={false} href="/signup" className="card flex items-center gap-3 p-4 hover:border-accent">
          <UserPlus className="size-6 shrink-0 text-accent" aria-hidden />
          <span className="font-semibold">{t.success.signup}</span>
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          <MessageCircle className="size-5" aria-hidden /> {t.success.share}
        </a>
        {session?.role === "DONOR" && <Link prefetch={false} href="/account" className="btn-secondary">{t.success.all}</Link>}
        <Link prefetch={false} href="/" className="btn-ghost">{t.success.home}</Link>
      </div>
    </div>
  );
}
