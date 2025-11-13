import { z } from "zod";

import { ServiceName, ServiceProvider } from "@calcom/prisma/enums";

export const ZUpdateServiceProviderInputSchema = z
  .object({
    serviceName: z.nativeEnum(ServiceName),
    defaultProvider: z.nativeEnum(ServiceProvider),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validation: Ensure provider is valid for the service
    const validProvidersForService: Record<ServiceName, ServiceProvider[]> = {
      MESSAGING: [ServiceProvider.TWILIO, ServiceProvider.ICSMOBILE],
      PAYMENTS: [], // Will be populated later
      EMAIL: [], // Will be populated later
    };

    const allowedProviders = validProvidersForService[data.serviceName];

    if (!allowedProviders.includes(data.defaultProvider)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Provider ${data.defaultProvider} is not valid for service ${data.serviceName}`,
        path: ["defaultProvider"],
      });
    }
  });

export type TUpdateServiceProviderInputSchema = z.infer<typeof ZUpdateServiceProviderInputSchema>;
