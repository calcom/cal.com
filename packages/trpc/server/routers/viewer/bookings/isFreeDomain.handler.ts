import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";

import type { TIsFreeDomainInputSchema } from "./isFreeDomain.schema";

export const isFreeDomainHandler = async ({ input }: { input: TIsFreeDomainInputSchema }) => {
  const isFreeDomain = await checkIfFreeEmailDomain({ email: input.email });
  return { isFreeDomain };
};
