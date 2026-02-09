import type { Team } from "@calcom/prisma/client";

import {
  SubscriptionStatus,
  IBillingRepositoryCreateArgs,
} from "../../repository/billing/IBillingRepository";

export type TeamBillingInput = Pick<Team, "id" | "parentId" | "metadata" | "isOrganization">;
export const TeamBillingPublishResponseStatus = {
  REQUIRES_PAYMENT: "REQUIRES_PAYMENT",
  REQUIRES_UPGRADE: "REQUIRES_UPGRADE",
  SUCCESS: "SUCCESS",
} as const;

export type TeamBillingPublishResponse = {
  redirectUrl: string | null;
  status: (typeof TeamBillingPublishResponseStatus)[keyof typeof TeamBillingPublishResponseStatus];
};

export interface ITeamBillingService {
  cancel(): Promise<void>;
  publish(): Promise<TeamBillingPublishResponse>;
  downgrade(): Promise<void>;
  updateQuantity(): Promise<void>;
  getSubscriptionStatus(): Promise<SubscriptionStatus | null>;
  endTrial(): Promise<boolean>;
  saveTeamBilling(args: IBillingRepositoryCreateArgs): Promise<void>;
}
