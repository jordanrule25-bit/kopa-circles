import Link from "next/link";
import { Leaf } from "@/components/plants";
import { devLoginEnabled } from "@/lib/session";

export const metadata = { title: "Check your email" };

export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <section className="mx-auto grid w-full max-w-md justify-items-center gap-4 py-10 text-center">
      <Leaf size={44} />
      <h1 className="text-4xl font-semibold">Check your email</h1>
      <p className="text-lg text-muted">
        We sent a sign-in link{email ? ` to ${email}` : ""}. It works once and expires in 15 minutes.
      </p>
      {devLoginEnabled() && (
        <Link href="/dev/outbox" className="rounded-full bg-surface px-5 py-2.5 font-medium text-accent shadow-card hover:underline">
          Open the dev outbox ›
        </Link>
      )}
      <Link href="/signin" className="text-sm text-accent hover:underline">
        Use a different email
      </Link>
    </section>
  );
}
