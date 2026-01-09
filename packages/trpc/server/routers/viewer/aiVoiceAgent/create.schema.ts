import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string().optional(),
  teamId: z.number().optional(),
  workflowStepId: z.number().optional(),
  templateWorkflowId: z.string().optional(),
  generalPrompt: z.string().optional(),
  beginMessage: z.string().optional(),
  generalTools: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        description: z.string().optional(),
        cal_api_key: z.string().optional(),
        event_type_id: z.number().optional(),
        timezone: z.string().optional(),
      })
    )
    .optional(),
  voiceId: z.string().optional().default("11labs-Adrian"),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
