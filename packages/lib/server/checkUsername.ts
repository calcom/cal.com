import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";

import { checkRegularUsername } from "./checkRegularUsername";
import { usernameCheck as checkPremiumUsername } from "./username";

// TODO: Replace `lib/checkPremiumUsername` with `usernameCheck` and then import checkPremiumUsername directly here.
// We want to remove dependency on website for signup stuff as signup is now part of app.
export const checkUsername = !IS_PREMIUM_USERNAME_ENABLED ? checkRegularUsername : checkPremiumUsername;
