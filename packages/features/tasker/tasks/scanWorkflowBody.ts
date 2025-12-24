import z from "zod";

import { getTemplateBodyForAction } from "@calcom/features/ee/workflows/lib/actionHelperFunctions";
import compareReminderBodyToTemplate from "@calcom/features/ee/workflows/lib/compareReminderBodyToTemplate";
import { scheduleWorkflowNotifications } from "@calcom/features/ee/workflows/lib/scheduleWorkflowNotifications";
import { Task } from "@calcom/features/tasker/repository";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import prisma from "@calcom/prisma";

export const scanWorkflowBodySchema = z.object({
  userId: z.number(),
  // deprecated: use workflowStepId instead
  workflowStepIds: z.array(z.number()).optional(),
  workflowStepId: z.number().optional(),
  createdAt: z.string().optional(),
});

const log = logger.getSubLogger({ prefix: ["[tasker] scanWorkflowBody"] });

export async function scanWorkflowBody(payload: string) {
  const { workflowStepIds, userId, createdAt, workflowStepId } = scanWorkflowBodySchema.parse(
    JSON.parse(payload)
  );

  const stepIdsToScan: number[] = workflowStepIds ? workflowStepIds : [];

  if (workflowStepId && !workflowStepIds) {
    if (createdAt) {
      const hasNewerTask = await Task.hasNewerScanTaskForStepId(workflowStepId, createdAt);

      if (hasNewerTask) return;

      stepIdsToScan.push(workflowStepId);
    } else {
      stepIdsToScan.push(workflowStepId);
    }
  }

  if (stepIdsToScan.length === 0) return;

  const workflowSteps = await prisma.workflowStep.findMany({
    where: {
      id: {
        in: stepIdsToScan,
      },
    },
    include: {
      workflow: {
        select: {
          user: {
            select: {
              locale: true,
              timeFormat: true,
              whitelistWorkflows: true,
            },
          },
        },
      },
    },
  });

  if (process.env.IFFY_API_KEY) {
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
        t: await getTranslation(workflowStep.workflow.user?.locale ?? "en", "common"),
        template: workflowStep.template,
        timeFormat,
      });

      if (!defaultTemplate) {
        log.error(`Template not found for action ${workflowStep.action}, template ${workflowStep.template}`);
        continue;
      }

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

      const isSpam = await iffyScanBody(workflowStep.reminderBody, workflowStep.id);

      if (isSpam) {
        if (!workflowStep.workflow.user?.whitelistWorkflows) {
          // We won't delete the workflow step incase it is flagged as a false positive
          log.warn(`Workflow step ${workflowStep.id} is spam with body ${workflowStep.reminderBody}`);

          // Return early if spam is detected
          return;
        }
        log.warn(`For whitelisted user, workflow step ${workflowStep.id} marked as spam`);
      }

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

  if (!process.env.IFFY_API_KEY) {
    log.info("IFFY_API_KEY not set, skipping scan");
    await prisma.workflowStep.updateMany({
      where: {
        id: {
          in: stepIdsToScan,
        },
      },
      data: {
        verifiedAt: new Date(),
      },
    });
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      steps: {
        some: {
          id: {
            in: stepIdsToScan,
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
    log.warn(`Workflow with steps ${stepIdsToScan} not found`);
    return;
  }

  const isOrg = !!workflow?.team?.isOrganization;

  await scheduleWorkflowNotifications({
    activeOn: workflow.activeOn.map((activeOn) => activeOn.eventTypeId) ?? [],
    isOrg,
    workflowSteps: workflowSteps.map((step) => ({
      ...step,
      verifiedAt: new Date(),
    })),
    time: workflow.time,
    timeUnit: workflow.timeUnit,
    trigger: workflow.trigger,
    userId,
    teamId: workflow.team?.id || null,
  });
}

export const iffyScanBody = async (body: string, workflowStepId: number) => {
  try {
    const response = await fetch("https://api.iffy.com/api/v1/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.IFFY_API_KEY}`,
      },
      body: JSON.stringify({
        clientId: `Workflow step - ${workflowStepId}`,
        name: "Workflow",
        entity: "WorkflowBody",
        content: body,
        passthrough: true,
      }),
    });

    const data = await response.json();
    return data.flagged;
  } catch (error) {
    log.error(`Error scanning workflow body for workflow step ${workflowStepId}:`, error);
  }
};
