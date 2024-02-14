import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";

import { checkRegularUsername } from "./checkRegularUsername";
import { usernameCheck as checkPremiumUsername } from "./username";

// FIXME: Why don't we use checkPremiumUsername from "@calcom/features/ee/common/lib/checkPremiumUsername" here?
// If we don't want to delegate to website's username endpoint, we can just replace checkPremiumUsername logic with usernameCheck
export const checkUsername = !IS_PREMIUM_USERNAME_ENABLED ? checkRegularUsername : checkPremiumUsername;
