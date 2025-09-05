import { bookingConfirmPatchBodySchema } from "@calcom/prisma/zod-utils";
import type { z } from "zod";

export const ZConfirmInputSchema = bookingConfirmPatchBodySchema;

export type TConfirmInputSchema = z.infer<typeof ZConfirmInputSchema>;
