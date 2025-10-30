import { ITeamBillingRepository, TeamBillingType } from "./teamBilling.repository.interface";

export class StubTeamBillingRepository implements ITeamBillingRepository {
  stubTeam = { id: -1, metadata: {}, isOrganization: true, parentId: -1, name: "" };

  async find(teamId: number) {
    return this.stubTeam;
  }

  async findBySubscriptionId(subscriptionId: string): Promise<TeamBillingType> {
    return this.stubTeam;
  }

  async findMany(teamIds: number[]): Promise<TeamBillingType[]> {
    return [];
  }
}
