import type { z } from "zod";

import { createOrganizationSchema } from "@calcom/features/ee/organizations/types/schemas";

export const ZCreateSelfHostedInputSchema = createOrganizationSchema;

export type TCreateSelfHostedInputSchema = z.infer<typeof ZCreateSelfHostedInputSchema>;
