import { createOrganizationSchema } from "@calcom/features/ee/organizations/types/schemas";
import type { z } from "zod";

export const ZCreateSelfHostedInputSchema = createOrganizationSchema;

export type TCreateSelfHostedInputSchema = z.infer<typeof ZCreateSelfHostedInputSchema>;
