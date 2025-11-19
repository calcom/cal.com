import z from "zod";

export const sendAnalyticsEventSchema = z.object({
  credentialId: z.number(),
  info: z.object({
    name: z.string(),
    email: z.string(),
    id: z.string(),
    eventName: z.string(),
    externalId: z.string().optional(),
  }),
});
