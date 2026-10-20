import { Back, PageHead } from "@/components/ui";
import { SECTORS } from "@/lib/circle-rules";
import { requireAgent } from "@/lib/session";
import { CircleForm } from "./circle-form";

export default async function NewCircle() {
  const agent = await requireAgent();
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Back href="/agent">My circles</Back>
      <PageHead title="New circle" sub="Next you’ll add the five members and check their limits." />
      <div className="mt-4">
        <CircleForm town={agent.town} sectors={SECTORS} />
      </div>
    </div>
  );
}
