import { ITeamBillingRepository, TeamBillingType } from "./teamBilling.repository.interface";

export class StubTeamBillingDataRepository implements ITeamBillingRepository {
  stubTeam = { id: -1, metadata: {}, isOrganization: true, parentId: -1, name: "" };

  async find() {
    return this.stubTeam;
  }

  async findBySubscriptionId(): Promise<TeamBillingType> {
    return this.stubTeam;
  }

  async findMany(): Promise<TeamBillingType[]> {
    return [];
  }
}
