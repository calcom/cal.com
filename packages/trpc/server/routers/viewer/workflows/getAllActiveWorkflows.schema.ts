import type { Workflow } from "@calcom/ee/workflows/lib/types";
import { ZWorkflow } from "@calcom/ee/workflows/lib/types";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { z } from "zod";

type TWorkflows = { workflow: Workflow }[] | undefined;

export const ZWorkflows: z.ZodType<TWorkflows> = z
  .object({
    workflow: ZWorkflow,
  })
  .array()
  .optional();

export type TGetAllActiveWorkflowsInputSchema = {
  eventType: {
    id: number;
    teamId?: number | null;
    parent?: {
      id: number | null;
      teamId: number | null;
    } | null;
    metadata: z.infer<typeof EventTypeMetaDataSchema>;
    userId?: number | null;
  };
};

export const ZGetAllActiveWorkflowsInputSchema: z.ZodType<TGetAllActiveWorkflowsInputSchema> = z.object({
  eventType: z.object({
    id: z.number(),
    teamId: z.number().optional().nullable(),
    parent: z
      .object({
        id: z.number().nullable(),
        teamId: z.number().nullable(),
      })
      .optional()
      .nullable(),
    metadata: EventTypeMetaDataSchema,
    userId: z.number().optional().nullable(),
  }),
});
