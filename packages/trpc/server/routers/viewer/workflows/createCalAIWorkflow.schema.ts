import { z } from "zod";

export const ZCreateCalAIWorkflowInputSchema = z.object({
  templateId: z.enum(["wf-10", "wf-11"]),
  teamId: z.number().optional(),
  name: z.string().optional(),
});

export type TCreateCalAIWorkflowInputSchema = z.infer<typeof ZCreateCalAIWorkflowInputSchema>;