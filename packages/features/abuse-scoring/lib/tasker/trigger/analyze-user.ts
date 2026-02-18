import { schemaTask, type TaskWithSchema } from "@trigger.dev/sdk";
import type { z } from "zod";

import { abuseScoringTaskConfig } from "./config";
import { abuseScoringTaskSchema } from "./schema";

export const ANALYZE_USER_JOB_ID = "abuse-scoring.analyze-user";

export const analyzeUser: TaskWithSchema<typeof ANALYZE_USER_JOB_ID, typeof abuseScoringTaskSchema> =
  schemaTask({
    id: ANALYZE_USER_JOB_ID,
    ...abuseScoringTaskConfig,
    schema: abuseScoringTaskSchema,
    run: async (payload: z.infer<typeof abuseScoringTaskSchema>) => {
      const { getAbuseScoringTaskService } = await import(
        "@calcom/features/abuse-scoring/di/tasker/AbuseScoringTaskService.container"
      );

      const taskService = getAbuseScoringTaskService();
      await taskService.analyzeUser(payload);
    },
  });
