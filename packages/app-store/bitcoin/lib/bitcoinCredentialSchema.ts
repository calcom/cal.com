import { z } from "zod";

export const bitcoinCredentialSchema = z.object({
  ln_name_url: z.string(),
  payment_fee_fixed: z.number(),
});
