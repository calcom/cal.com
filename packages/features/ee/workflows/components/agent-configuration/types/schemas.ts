import { isValidPhoneNumber } from "libphonenumber-js/max";
import { z } from "zod";

export const agentSchema = z.object({
  generalPrompt: z.string().min(1, "General prompt is required"),
  beginMessage: z.string().min(1, "Begin message is required"),
  numberToCall: z.string().optional(),
  language: z.string().optional(),
  voiceId: z.string().optional(),
  outboundEventTypeId: z.number().optional(),
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
});

export const phoneNumberFormSchema = z.object({
  phoneNumber: z.string().refine((val) => isValidPhoneNumber(val)),
  terminationUri: z.string().min(1, "Termination URI is required"),
  sipTrunkAuthUsername: z.string().optional(),
  sipTrunkAuthPassword: z.string().optional(),
  nickname: z.string().optional(),
});

export type AgentFormValues = z.infer<typeof agentSchema>;
export type PhoneNumberFormValues = z.infer<typeof phoneNumberFormSchema>;

// Commented types for future implementation
// type RetellData = RouterOutputs["viewer"]["ai"]["get"]["retellData"];

// type ToolDraft = {
//   type: string;
//   name: string;
//   description: string | null;
//   cal_api_key: string | null;
//   event_type_id: number | null;
//   timezone: string;
// };
