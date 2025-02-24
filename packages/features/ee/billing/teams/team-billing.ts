import type { Team } from "@prisma/client";

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

export interface TeamBilling {
  cancel(): Promise<void>;
  publish(): Promise<TeamBillingPublishResponse>;
  downgrade(): Promise<void>;
  updateQuantity(): Promise<void>;
}
