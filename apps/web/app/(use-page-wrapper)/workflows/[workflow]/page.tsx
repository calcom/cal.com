import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { cache } from "react";

import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import LegacyPage from "@calcom/features/ee/workflows/pages/workflow";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { workflowsRouter } from "@calcom/trpc/server/routers/viewer/workflows/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";


const querySchema = z.object({
  workflow: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "workflow must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

const Page = async ({ params }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const parsed = querySchema.safeParse(await params);
      
  if (!parsed.success) {
    notFound();
  }
  const workFlowId = parsed.data.workflow;

  const [workflowCaller, eventCaller, userCaller] = await Promise.all([
    createRouterCaller(workflowsRouter),
    createRouterCaller(eventTypesRouter),
    createRouterCaller(meRouter),
  ]);

  const workflowData = await workflowCaller.get({ id: workFlowId });

  if (!workflowData) return notFound();

  const isOrg = workflowData?.team?.isOrganization ?? false;
  const teamId = workflowData?.teamId ?? undefined;


  const [verifiedEmails, verifiedNumbers, eventsData, user] = await Promise.all([
    workflowCaller.getVerifiedEmails({ teamId }),
    teamId ? workflowCaller.getVerifiedNumbers({ teamId }) : Promise.resolve([]),
    eventCaller.getTeamAndEventTypeOptions({ teamId, isOrg }),
    userCaller.get(),
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
