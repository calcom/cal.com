import { z } from "zod";

export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

export const appDataSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const webhookPayloadSchema = z.object({
  value: z.array(
    z.object({
      subscriptionId: z.string().min(1),
      clientState: z.string().optional(),
      resource: z.string().min(1),
      changeType: z.enum(["created", "updated", "deleted"]),
      resourceData: z
        .object({
          "@odata.type": z.string().optional(),
          "@odata.id": z.string().optional(),
          id: z.string().optional(),
        })
        .optional(),
      subscriptionExpirationDateTime: z.string().optional(),
      tenantId: z.string().optional(),
    })
  ),
});
