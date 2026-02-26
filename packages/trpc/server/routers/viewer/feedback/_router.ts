import { FormbricksAPI } from "@formbricks/api";
import { z } from "zod";

import logger from "@calcom/lib/logger";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

const log = logger.getSubLogger({ prefix: ["feedback"] });

export const feedbackRouter = router({
  /**
   * Submit feedback to Formbricks.
   * This allows us to use our own UI while still sending data to Formbricks.
   */
  submitFeedback: authedProcedure
    .input(
      z.object({
        surveyId: z.string(),
        data: z.record(z.string(), z.union([z.string(), z.number()])),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hostUrl = process.env.NEXT_PUBLIC_FORMBRICKS_HOST_URL;
      const environmentId = process.env.NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID;

      if (!hostUrl || !environmentId) {
        // Silently succeed if Formbricks is not configured
        return { success: true };
      }

      const api = new FormbricksAPI({
        apiHost: hostUrl,
        environmentId,
      });

      const result = await api.client.response.create({
        surveyId: input.surveyId,
        userId: ctx.user.id.toString(),
        finished: true,
        data: input.data,
      });

      if (!result.ok) {
        log.error("Formbricks API error", { error: result.error });
        return { success: false };
      }

      return { success: true };
    }),
});
