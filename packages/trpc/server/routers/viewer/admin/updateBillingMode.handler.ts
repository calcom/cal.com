import {
  getAdminBillingRepository,
  getBillingProviderService,
} from "@calcom/features/ee/billing/di/containers/Billing";
import { AdminBillingModeService } from "@calcom/features/ee/billing/service/adminBillingMode/AdminBillingModeService";
import { BillingMode } from "@calcom/prisma/enums";

import type { TUpdateBillingModeSchema } from "./updateBillingMode.schema";

export default async function handler({ input }: { input: TUpdateBillingModeSchema }) {
  const service = new AdminBillingModeService(getAdminBillingRepository(), getBillingProviderService());

  return service.updateBillingMode({
    ...input,
    billingMode: BillingMode[input.billingMode],
  });
}
