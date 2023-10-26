import { IS_CALCOM } from "@calcom/lib/constants";

import { checkRegularUsername } from "./checkRegularUsername";
import { usernameCheck as checkPremiumUsername } from "./username";

export const checkUsername = !IS_CALCOM ? checkRegularUsername : checkPremiumUsername;
