import { z } from "zod";

const ExperimentStatusDtoSchema = z.enum(["DRAFT", "RUNNING", "STOPPED", "ROLLED_OUT"]);

export type ExperimentStatusDto = "DRAFT" | "RUNNING" | "STOPPED" | "ROLLED_OUT";

export const ExperimentConfigDtoSchema = z.object({
  slug: z.string(),
  status: ExperimentStatusDtoSchema,
  winner: z.string().nullable(),
  variants: z.array(
    z.object({
      slug: z.string(),
      weight: z.number(),
    })
  ),
});

export type ExperimentConfigDto = z.infer<typeof ExperimentConfigDtoSchema>;

export const ExperimentConfigDtoArraySchema = z.array(ExperimentConfigDtoSchema);
