import { AkismetClient } from "akismet-api";
import type { Comment } from "akismet-api";
import z from "zod";

import { lockUser } from "@calcom/lib/autoLock";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

export const scanWorkflowBodySchema = z.object({
  userId: z.number(),
  workflowStepId: z.number(),
});

const log = logger.getSubLogger({ prefix: ["[tasker] scanWorkflowBody"] });

export async function scanWorkflowBody(payload: string) {
  if (!process.env.AKISMET_API_KEY) {
    log.warn("AKISMET_API_KEY not set, skipping scan");
    return;
  }

  const { workflowStepId, userId } = scanWorkflowBodySchema.parse(JSON.parse(payload));

  const workflowStep = await prisma.workflowStep.findUnique({
    where: {
      id: workflowStepId,
    },
  });

  if (!workflowStep?.reminderBody) return;

  const client = new AkismetClient({ key: process.env.AKISMET_API_KEY, blog: WEBAPP_URL });

  const comment: Comment = {
    user_ip: "127.0.0.1",
    content: workflowStep.reminderBody,
  };

  const isSpam = await client.checkSpam(comment);

  if (isSpam) {
    log.warn(`Workflow step ${workflowStepId} is spam with body ${workflowStep.reminderBody}`);

    await prisma.workflowStep.delete({
      where: {
        id: workflowStepId,
      },
    });

    await lockUser("userId", userId.toString());
  }
}
