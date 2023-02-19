import { z } from "zod";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const bitcoinAppKeysSchema = z.object({
  ln_name_url: z.string(),
  payment_fee_fixed: z.string(),
});

export const getBitcoinAppKeys = async () => {
  return getParsedAppKeysFromSlug("bitcoin", bitcoinAppKeysSchema);
};
