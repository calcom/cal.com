import { IS_PRODUCTION } from "@calcom/lib/constants";

import { loadTaskPlugin } from "./registry";

export const tasksConfig = {
  createCRMEvent: {
    minRetryIntervalMins: IS_PRODUCTION ? 10 : 1,
    maxAttempts: 10,
  },
  executeAIPhoneCall: {
    maxAttempts: 1,
  },
};

export { loadTaskPlugin };
