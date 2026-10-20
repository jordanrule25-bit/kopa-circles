import Link from "next/link";
import { SECTORS } from "@/lib/circle-rules";
import { requireAgent } from "@/lib/session";
import { CircleForm } from "./circle-form";

export default async function NewCircle() {
  const agent = await requireAgent();
  return (
    <main>
      <Link href="/agent" className="mt-6 inline-block text-sm text-stone-500 hover:underline">
        ← Your circles
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New circle</h1>
      <p className="text-sm text-stone-500">Next you’ll add the five members and check their limits.</p>
      <CircleForm town={agent.town} sectors={SECTORS} />
    </main>
  );
}
