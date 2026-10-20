import { prisma } from "@kopa/db";
import { notFound } from "next/navigation";
import { Note, PageHead, Panel } from "@/components/ui";
import { date } from "@/lib/format";
import { devLoginEnabled } from "@/lib/session";

export const metadata = { title: "Dev outbox" };

// Development only: emails and texts that would have been sent.
export default async function Outbox() {
  if (!devLoginEnabled()) notFound();
  const messages = await prisma.devMessage.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  return (
    <>
      <PageHead title="Dev outbox" sub="Sign-in links and codes land here instead of being emailed or texted. Never available in production." />
      {messages.length === 0 && <p className="text-muted">Nothing sent yet.</p>}
      <div className="grid gap-4">
        {messages.map((m) => (
          <Panel key={m.id} data-testid="dev-message">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
              <span>
                {m.channel === "EMAIL" ? "Email" : "SMS"} to <span className="font-medium text-fg">{m.to}</span>
              </span>
              <span>
                {date(m.createdAt)} {m.createdAt.toLocaleTimeString("en-GB")}
              </span>
            </div>
            {m.subject && <div className="font-semibold">{m.subject}</div>}
            <p className="whitespace-pre-wrap break-words">
              {m.body.split(/(https?:\/\/\S+)/).map((part, i) =>
                /^https?:\/\//.test(part) ? (
                  <a key={i} href={part} className="text-accent underline">
                    {part}
                  </a>
                ) : (
                  part
                ),
              )}
            </p>
          </Panel>
        ))}
      </div>
      <Note>Configure RESEND_API_KEY and AT_API_KEY to send for real.</Note>
    </>
  );
}
