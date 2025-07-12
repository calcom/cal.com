import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LegacyPage from "@calcom/features/ee/workflows/pages/workflow";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";
import {
  getCachedUser,
  getCachedWorkflowById,
  getCachedWorkflowVerifiedNumber,
  getCachedWorkflowVerifiedEmails,
} from "@calcom/web/cache/workflows";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const querySchema = z.object({
  workflow: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "workflow must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata | null> => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    notFound();
  }
  const workflow = await getCachedWorkflowById(parsed.data.workflow);
  if (!workflow) {
    notFound();
  }
  return await _generateMetadata(
    (t) => (workflow && workflow.name ? workflow.name : t("untitled")),
    () => "",
    undefined,
    undefined,
    `/workflows/${parsed.data.workflow}`
  );
};

const Page = async ({ params }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (!session?.user?.email) {
    throw new Error("User email not found");
  }

  const parsed = querySchema.safeParse(await params);

  if (!parsed.success) {
    notFound();
  }
  const workFlowId = parsed.data.workflow;

  const eventCaller = await createRouterCaller(eventTypesRouter);

  const workflowData = await getCachedWorkflowById(workFlowId);

  if (!workflowData) return notFound();

  const isOrg = workflowData?.team?.isOrganization ?? false;
  const teamId = workflowData?.teamId ?? undefined;

  const [verifiedEmails, verifiedNumbers, eventsData, user] = await Promise.all([
    getCachedWorkflowVerifiedEmails(session.user.email, session.user.id, teamId),
    teamId ? getCachedWorkflowVerifiedNumber(teamId, session.user.id) : [],
    eventCaller.getTeamAndEventTypeOptions({ teamId, isOrg }),
    getCachedUser(session.user, session.upId),
  ]);

  return (
    <LegacyPage
      user={user}
      eventsData={eventsData}
      workflowId={workFlowId}
      workflow={workflowData}
      verifiedNumbers={verifiedNumbers}
      verifiedEmails={verifiedEmails}
    />
  );
};

export default Page;
