import { prisma } from "@kopa/db";
import { notFound, redirect } from "next/navigation";
import { MemberSlots, Steps } from "@/components/agent-ui";
import { Back } from "@/components/ui";
import { CIRCLE_SIZE } from "@/lib/circle-rules";
import { requireAgent } from "@/lib/session";
import { addMember, previewLimit } from "../../../../actions";
import { MemberForm } from "./member-form";

export const metadata = { title: "Add member" };

export default async function NewMember({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await requireAgent();
  const circle = await prisma.circle.findFirst({ where: { id, agentId: agent.userId }, include: { _count: { select: { members: true } } } });
  if (!circle) notFound();
  if (circle.status !== "FORMING" || circle._count.members >= CIRCLE_SIZE) redirect(`/agent/circles/${id}`);
  const slot = circle._count.members + 1;

  return (
    <div className="agent mx-auto grid w-full max-w-xl gap-5">
      <div className="grid gap-4">
        <Back href={`/agent/circles/${id}`}>{circle.name}</Back>
        <Steps current={1} />
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold">Member {slot}</h1>
          <MemberSlots filled={circle._count.members} />
        </div>
      </div>
      <MemberForm action={addMember.bind(null, id)} preview={previewLimit.bind(null, id)} slot={slot} circleId={id} />
    </div>
  );
}
