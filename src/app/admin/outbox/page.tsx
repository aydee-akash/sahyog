import { Mail, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getT } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.admin.meta.outbox };
}

export default async function Outbox() {
  const [messages, { t }] = await Promise.all([prisma.outbox.findMany({ orderBy: { createdAt: "desc" }, take: 50 }), getT()]);
  const a = t.admin.outbox;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[1.75rem]">{a.title}</h1>
        <p className="text-muted">{a.lead}</p>
      </div>
      {messages.length === 0 ? (
        <p className="card p-6 text-muted">{a.empty}</p>
      ) : (
        <ul className="grid gap-3">
          {messages.map((m) => (
            <li key={m.id} className="card grid gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.9rem] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  {m.channel === "SMS" ? <MessageSquare className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
                  {m.to}
                </span>
                <span>{m.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              <p className="font-semibold">{m.subject}</p>
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-paper p-3 font-[inherit] text-[0.9rem] text-muted">
                {m.body.replace(/\?t=[\w.-]+/g, "?t=•••")}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
