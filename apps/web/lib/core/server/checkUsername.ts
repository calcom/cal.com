import { checkPremiumUsername } from "@calcom/ee/lib/core/checkPremiumUsername";

import { checkRegularUsername } from "@lib/core/server/checkRegularUsername";

export const checkUsername =
  process.env.NEXT_PUBLIC_WEBSITE_URL === "https://cal.com" ? checkPremiumUsername : checkRegularUsername;
