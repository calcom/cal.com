import { PrismaTeamBillingDataRepository } from "./PrismaTeamBillingRepository";
import { StubTeamBillingDataRepository } from "./stubTeamBillingRepository";

export class TeamBillingDataRepositoryFactory {
  static getRepository(isBillingEnabled: boolean) {
    if (isBillingEnabled) return new PrismaTeamBillingDataRepository();

    return new StubTeamBillingDataRepository();
  }
}
