import { z } from "zod";

export const ZGetDeploymentInfoSchema = z.object({
  email: z.string().email(),
});

export type TGetDeploymentInfoSchema = z.infer<typeof ZGetDeploymentInfoSchema>;
