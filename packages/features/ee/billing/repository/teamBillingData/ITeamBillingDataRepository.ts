import type { Prisma } from "@calcom/prisma/client";

export const teamBillingSelect = {
  id: true,
  metadata: true,
  isOrganization: true,
  parentId: true,
  name: true,
} satisfies Prisma.TeamSelect;

export type TeamBillingType = Prisma.TeamGetPayload<{
  select: typeof teamBillingSelect;
}>;

export type TeamWithBillingRecords = {
  id: number;
  isOrganization: boolean;
  metadata: Prisma.JsonValue;
  teamBilling: { id: string } | null;
  organizationBilling: { id: string } | null;
};

export interface ITeamBillingDataRepository {
  find(teamId: number): Promise<TeamBillingType>;
  findBySubscriptionId(subscriptionId: string): Promise<TeamBillingType | null>;
  findMany(teamIds: number[]): Promise<TeamBillingType[]>;
  findByIdIncludeBillingRecords(teamId: number): Promise<TeamWithBillingRecords | null>;
}
