import { PrismaTeamBillingRepository } from "./prismaTeamBilling.repository";
import { StubTeamBillingRepository } from "./stubTeamBilling.repository";

export class TeamBillingRepositoryFactor {
  static getRepository(isBillingEnabled: boolean) {
    if (isBillingEnabled) return new PrismaTeamBillingRepository();

    return new StubTeamBillingRepository();
  }
}
