import { z } from "zod";

export const ZProjectMutationInputSchema = z.object({
  projectId: z.string(),
});

export type TProjectMutationInputSchema = z.infer<typeof ZProjectMutationInputSchema>;
