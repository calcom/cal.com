import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { handler } from "@calcom/features/ee/workflows/api/scheduleSMSReminders";

const creditService = new CreditService();
const creditCheckFn = ({ userId, teamId }: { userId?: number | null; teamId?: number | null }) =>
  creditService.hasAvailableCredits({ userId, teamId });

export const POST = defaultResponderForAppDir(handler({ creditCheckFn }));
