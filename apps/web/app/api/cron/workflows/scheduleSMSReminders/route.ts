import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { handler } from "@calcom/features/ee/workflows/api/scheduleSMSReminders";

const creditService = new CreditService();
export const POST = defaultResponderForAppDir(handler({ creditCheckFn: creditService.hasAvailableCredits }));
