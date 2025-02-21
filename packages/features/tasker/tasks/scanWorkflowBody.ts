import { AkismetClient } from "akismet-api";
import type { Comment } from "akismet-api";
import z from "zod";

import { getTemplateBodyForAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import compareReminderBodyToTemplate from "@calcom/features/ee/workflows/lib/compareReminderBodyToTemplate";
import { lockUser } from "@calcom/lib/autoLock";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
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
    include: {
      workflow: {
        select: {
          user: {
            select: {
              locale: true,
              timeFormat: true,
            },
          },
        },
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
          verifiedAt: new Date(),
        },
      });
      continue;
    }

    const timeFormat = getTimeFormatStringFromUserTimeFormat(workflowStep.workflow.user?.timeFormat);

    // Determine if body is a template
    const defaultTemplate = getTemplateBodyForAction({
      action: workflowStep.action,
      locale: workflowStep.workflow.user?.locale ?? "en",
      template: workflowStep.template,
      timeFormat,
    });

    if (
      compareReminderBodyToTemplate({ reminderBody: workflowStep.reminderBody, template: defaultTemplate })
    ) {
      await prisma.workflowStep.update({
        where: {
          id: workflowStep.id,
        },
        data: {
          verifiedAt: new Date(),
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
          verifiedAt: new Date(),
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
