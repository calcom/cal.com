import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  id: z.string(),
  teamId: z.number().optional(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  generalPrompt: z.string().nullish().default(null),
  beginMessage: z.string().nullish().default(null),
  generalTools: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        description: z.string().nullish().default(null),
        cal_api_key: z.string().nullish().default(null),
        event_type_id: z.number().nullish().default(null),
        timezone: z.string().nullish().default(null),
      })
    )
    .optional(),
  voiceId: z.string().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
