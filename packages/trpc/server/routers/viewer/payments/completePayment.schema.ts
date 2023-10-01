import type { z } from "zod";

import { CompletePaymentSchema } from "./type";

export const ZCompletePaymentInputSchema = CompletePaymentSchema;

export type TCompletePaymentInputSchema = z.infer<typeof ZCompletePaymentInputSchema>;
