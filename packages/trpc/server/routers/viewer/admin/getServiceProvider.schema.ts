import { z } from "zod";

import { ServiceName } from "@calcom/prisma/enums";

export const ZGetServiceProviderInputSchema = z.object({
  serviceName: z.nativeEnum(ServiceName),
});

export type TGetServiceProviderInputSchema = z.infer<typeof ZGetServiceProviderInputSchema>;
