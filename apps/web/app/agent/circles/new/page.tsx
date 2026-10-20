import { Steps } from "@/components/agent-ui";
import { Back } from "@/components/ui";
import { SECTORS } from "@/lib/circle-rules";
import { requireAgent } from "@/lib/session";
import { CircleForm } from "./circle-form";

export const metadata = { title: "New circle" };

export default async function NewCircle() {
  const agent = await requireAgent();
  return (
    <div className="agent mx-auto grid w-full max-w-xl gap-5">
      <div className="grid gap-4">
        <Back href="/agent">My circles</Back>
        <Steps current={0} />
        <h1 className="text-3xl font-semibold">New circle</h1>
      </div>
      <CircleForm town={agent.town} sectors={SECTORS} />
    </div>
  );
}
