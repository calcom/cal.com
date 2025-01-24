import { AkismetClient } from "akismet-api";
import type { Comment } from "akismet-api";
import z from "zod";

import { lockUser } from "@calcom/lib/autoLock";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { scheduleWorkflowNotifications } from "@calcom/trpc/server/routers/viewer/workflows/util";

export const scanWorkflowBodySchema = z.object({
  userId: z.number(),
  workflowStepIds: z.array(z.number()),
});

const log = logger.getSubLogger({ prefix: ["[tasker] scanWorkflowBody"] });

export async function scanWorkflowBody(payload: string) {
  if (!process.env.AKISMET_API_KEY) {
    log.info("AKISMET_API_KEY not set, skipping scan");
    return;
  }

  const { workflowStepIds, userId } = scanWorkflowBodySchema.parse(JSON.parse(payload));

  const workflowSteps = await prisma.workflowStep.findMany({
    where: {
      id: {
        in: workflowStepIds,
      },
    },
  });

  const client = new AkismetClient({ key: process.env.AKISMET_API_KEY, blog: WEBAPP_URL });

  for (const workflowStep of workflowSteps) {
    if (!workflowStep.reminderBody) {
      await prisma.workflowStep.update({
        where: {
          id: workflowStep.id,
        },
        data: {
          safe: true,
        },
      });
      continue;
    }

    const comment: Comment = {
      user_ip: "127.0.0.1",
      content: workflowStep.reminderBody,
    };

    const isSpam = await client.checkSpam(comment);

    if (isSpam) {
      // We won't delete the workflow step incase it is flagged as a false positive
      log.warn(`Workflow step ${workflowStep.id} is spam with body ${workflowStep.reminderBody}`);
      await lockUser("userId", userId.toString());

      // Return early if spam is detected
      return;
    } else {
      await prisma.workflowStep.update({
        where: {
          id: workflowStep.id,
        },
        data: {
          safe: true,
        },
      });
    }
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      steps: {
        some: {
          id: {
            in: workflowStepIds,
          },
        },
      },
    },
    include: {
      activeOn: true,
      team: true,
    },
  });

  if (!workflow) {
    log.warn(`Workflow with steps ${workflowStepIds} not found`);
    return;
  }

  const isOrg = !!workflow?.team?.isOrganization;

  await scheduleWorkflowNotifications({
    activeOn: workflow.activeOn.map((activeOn) => activeOn.eventTypeId) ?? [],
    isOrg,
    workflowSteps,
    time: workflow.time,
    timeUnit: workflow.timeUnit,
    trigger: workflow.trigger,
    userId,
    teamId: workflow.team?.id || null,
  });
}
