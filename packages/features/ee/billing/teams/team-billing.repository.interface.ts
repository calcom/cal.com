import { Prisma } from "@prisma/client";

export const teamBillingSelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  metadata: true,
  isOrganization: true,
  parentId: true,
});

export type TeamBillingType = Prisma.TeamGetPayload<{
  select: typeof teamBillingSelect;
}>;

export interface ITeamBillingRepository {
  find(teamId: number): Promise<TeamBillingType>;
  findBySubscriptionId(subscriptionId: string): Promise<TeamBillingType>;
  findMany(teamIds: number[]): Promise<TeamBillingType[]>;
}
