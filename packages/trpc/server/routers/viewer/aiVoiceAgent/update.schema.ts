import { z } from "zod";

import type { Language } from "@calcom/features/calAIPhone/providers/retellAI/types";

const languageSchema = z.enum([
  "en-US",
  "en-IN",
  "en-GB",
  "en-AU",
  "en-NZ",
  "de-DE",
  "es-ES",
  "es-419",
  "hi-IN",
  "fr-FR",
  "fr-CA",
  "ja-JP",
  "pt-PT",
  "pt-BR",
  "zh-CN",
  "ru-RU",
  "it-IT",
  "ko-KR",
  "nl-NL",
  "nl-BE",
  "pl-PL",
  "tr-TR",
  "th-TH",
  "vi-VN",
  "ro-RO",
  "bg-BG",
  "ca-ES",
  "da-DK",
  "fi-FI",
  "el-GR",
  "hu-HU",
  "id-ID",
  "no-NO",
  "sk-SK",
  "sv-SE",
  "multi",
]) satisfies z.ZodType<Language>;

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
  language: languageSchema.optional(),
  outboundEventTypeId: z.number().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
