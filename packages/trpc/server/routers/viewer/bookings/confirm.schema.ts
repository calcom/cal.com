import type { z } from "zod";

import { bookingConfirmPatchBodySchema } from "@calcom/prisma/zod-utils";

export const ZConfirmInputSchema = bookingConfirmPatchBodySchema;

export type TConfirmInputSchema = z.infer<typeof ZConfirmInputSchema>;
