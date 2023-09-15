import { checkPremiumUsername } from "@calcom/features/ee/common/lib/checkPremiumUsername";
import { IS_CALCOM } from "@calcom/lib/constants";

import { checkRegularUsername } from "./checkRegularUsername";

export const checkUsername = !IS_CALCOM ? checkRegularUsername : checkPremiumUsername;
