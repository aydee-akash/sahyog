import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { canViewReceipt } from "@/lib/receiptAccess";
import { formatINR } from "@/lib/money";
import { formatDateHi } from "@/lib/content";
import { CheckIcon } from "@/components/icons";
import { getSession } from "@/lib/auth";

export const metadata = { title: "धन्यवाद" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

export default async function Success({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  const donation = await prisma.donation.findUnique({ where: { id }, include: { receipt: true, campaign: true } });
  if (!donation?.receipt || !(await canViewReceipt(donation, t))) notFound();
  const session = await getSession();

  const pdfHref = `/api/receipts/${donation.id}${t ? `?t=${encodeURIComponent(t)}` : ""}`;
  const nextDebit = new Date(donation.receipt.issuedAt);
  nextDebit.setMonth(nextDebit.getMonth() + 1);

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div className="grid justify-items-start gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-ok-soft text-ok">
          <CheckIcon className="size-8" />
        </span>
        <h1 className="text-[2rem] font-bold leading-tight">धन्यवाद, {donation.donorName.split(" ")[0]}!</h1>
        <p className="text-lg text-muted">
          आपका {formatINR(donation.amount)} का दान &ldquo;{donation.campaign.titleHi}&rdquo; अभियान को मिल गया है।
        </p>
      </div>

      <div className="card grid gap-3 p-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted">रसीद नंबर</dt>
          <dd className="font-semibold">{donation.receipt.number}</dd>
          <dt className="text-muted">तारीख</dt>
          <dd>{formatDateHi(donation.receipt.issuedAt)}</dd>
          <dt className="text-muted">PAN</dt>
          <dd>{donation.donorPan}</dd>
          {donation.frequency === "MONTHLY" && (
            <>
              <dt className="text-muted">अगली किस्त</dt>
              <dd>{formatDateHi(nextDebit)} (टेस्ट मोड)</dd>
            </>
          )}
        </dl>
        <a href={pdfHref} target="_blank" rel="noopener" className="btn-primary mt-2">
          रसीद और 80G प्रमाण पत्र (PDF)
        </a>
        <p className="text-[0.9rem] text-muted">एक कॉपी {donation.donorEmail} पर भेजी गई है (डेमो में ईमेल मॉक है)।</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {session?.role === "DONOR" ? (
          <Link href="/account" className="btn-secondary">मेरे सभी दान</Link>
        ) : null}
        <Link href="/" className="btn-ghost">होम पेज</Link>
      </div>
    </div>
  );
}
