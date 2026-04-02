import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { SENDER_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import type { Workflow } from "@calcom/prisma/client";
import {
  MembershipRole,
  TimeUnit,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const WORKFLOW_TEMPLATES = {
  "wf-10": {
    name: "Cal.ai No-show Follow-up Call",
    trigger: WorkflowTriggerEvents.BOOKING_NO_SHOW_UPDATED,
    time: 0,
    timeUnit: TimeUnit.MINUTE,
  },
  "wf-11": {
    name: "Cal.ai 1-hour Meeting Reminder",
    trigger: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 1,
    timeUnit: TimeUnit.HOUR,
  },
} as const;

interface PageProps {
  searchParams: Promise<{
    action?: string;
    templateWorkflowId?: string;
    teamId?: string;
    name?: string;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const user = session?.user;

  const { action, templateWorkflowId, teamId, name } = await searchParams;

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `createWorkflow:${user?.id}`,
  });

  if (!user?.id) {
    const queryParams = new URLSearchParams();
    if (action) queryParams.set("action", action);
    if (templateWorkflowId) queryParams.set("templateWorkflowId", templateWorkflowId);
    if (teamId) queryParams.set("teamId", teamId);
    if (name) queryParams.set("name", name);

    const callbackUrl = `/workflow/new${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (action !== "calAi" || !templateWorkflowId) {
    redirect("/workflows");
  }

  if (templateWorkflowId !== "wf-10" && templateWorkflowId !== "wf-11") {
    redirect("/workflows");
  }

  const userId = user.id;
  const parsedTeamId = teamId ? parseInt(teamId, 10) : undefined;

  if (parsedTeamId) {
    const permissionService = new PermissionCheckService();

    const hasPermission = await permissionService.checkPermission({
      userId,
      teamId: parsedTeamId,
      permission: "workflow.create",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasPermission) {
      redirect("/workflows?error=unauthorized");
    }
  }

  const template = WORKFLOW_TEMPLATES[templateWorkflowId as keyof typeof WORKFLOW_TEMPLATES];

  try {
    const workflow: Workflow = await prisma.workflow.create({
      data: {
        name: name || template.name,
        trigger: template.trigger,
        time: template.time,
        timeUnit: template.timeUnit,
        userId,
        teamId: parsedTeamId,
      },
    });

    await prisma.workflowStep.create({
      data: {
        stepNumber: 1,
        action: WorkflowActions.CAL_AI_PHONE_CALL,
        template: WorkflowTemplates.CUSTOM,
        workflowId: workflow.id,
        sender: SENDER_NAME,
        numberVerificationPending: false,
        verifiedAt: new Date(),
        includeCalendarEvent: false,
      },
    });

    const redirectUrl = `/workflows/${workflow.id}?autoCreateAgent=true&templateWorkflowId=${templateWorkflowId}`;

    redirect(redirectUrl);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Failed to create Cal.ai workflow:", error);
    redirect("/workflows?error=failed-to-create-workflow");
  }
};

export default Page;
