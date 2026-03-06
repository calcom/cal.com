import {
  getOrgDunningRepository,
  getTeamDunningRepository,
} from "@calcom/features/ee/billing/di/containers/Billing";
import { BaseDunningService } from "@calcom/features/ee/billing/service/dunning/BaseDunningService";

import type { TrpcSessionUser } from "../../../types";
import type { TRefreshDunningInput } from "./refreshDunning.schema";

type RefreshDunningOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRefreshDunningInput;
};

export const refreshDunningHandler = async ({ input }: RefreshDunningOptions) => {
  const { billingId, entityType } = input;

  const repository =
    entityType === "organization" ? getOrgDunningRepository() : getTeamDunningRepository();

  const dunningService = new BaseDunningService({ dunningRepository: repository }, entityType);

  const record = await dunningService.findRecord(billingId);
  if (!record || !record.isInDunning) {
    return { success: true, previousStatus: "CURRENT", message: "Not in dunning" };
  }

  await dunningService.onPaymentSucceeded(billingId);

  return {
    success: true,
    previousStatus: record.status,
    message: `Dunning resolved from ${record.status} to CURRENT`,
  };
};

export default refreshDunningHandler;
