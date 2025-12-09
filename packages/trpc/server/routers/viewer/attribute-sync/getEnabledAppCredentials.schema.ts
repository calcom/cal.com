import { z } from "zod";

// No input required - organizationId comes from context
export const getEnabledAppCredentialsSchema = z.object({});

export type ZGetEnabledAppCredentialsSchema = z.infer<typeof getEnabledAppCredentialsSchema>;
