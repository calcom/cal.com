import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import { makeHandler } from "@calcom/features/ee/workflows/api/scheduleWhatsappReminders";

const creditService = new CreditService();
const creditCheckFn = ({ userId, teamId }: { userId?: number | null; teamId?: number | null }) =>
  creditService.hasAvailableCredits({ userId, teamId });

export const POST = defaultResponderForAppDir(makeHandler({ creditCheckFn }));
