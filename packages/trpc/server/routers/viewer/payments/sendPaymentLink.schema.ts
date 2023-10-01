import type { z } from "zod";

import { SendPaymentLinkSchema } from "./type";

export const ZSendPaymentLinkInputSchema = SendPaymentLinkSchema;

export type TSendPaymentLinkInputSchema = z.infer<typeof ZSendPaymentLinkInputSchema>;
