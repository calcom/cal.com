import { schemaTask, logger } from "@trigger.dev/sdk";
import { z } from "zod";

export const create = schemaTask({
  id: "calendar.google.create.event",
  schema: z.object({
    name: z.string(),
  }),
  run: async (payload: { name: string }) => {
    logger.info(`Hello create  ${payload.name}!`);
  },
});
