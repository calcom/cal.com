import { AkismetClient } from "akismet-api";
import type { Comment } from "akismet-api";
import z from "zod";

import prisma from "@calcom/prisma";

export const scanWorkflowBodySchema = z.object({
  workflowStepId: z.number(),
});

export async function scanWorkflowBody(payload: string) {
  const { workflowStepId } = scanWorkflowBodySchema.parse(JSON.parse(payload));

  const workflowStep = await prisma.workflowStep.findUnique({
    where: {
      id: workflowStepId,
    },
  });

  if (!workflowStep?.reminderBody) return;

  const key = "6451247bcfcd";
  const blog = "https://myblog.com";
  const client = new AkismetClient({ key, blog });

  const isValid = await client.verifyKey();

  const comment: Comment = {
    user_ip: "127.0.0.1",
    content: workflowStep.reminderBody,
  };

  const isSpam = await client.checkSpam(comment);

  return;
}
