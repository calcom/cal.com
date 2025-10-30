import { PrismaTeamBillingDataRepository } from "./prismaTeamBilling.repository";
import { StubTeamBillingDataRepository } from "./stubTeamBilling.repository";

export class TeamBillingDataRepositoryFactory {
  static getRepository(isBillingEnabled: boolean) {
    if (isBillingEnabled) return new PrismaTeamBillingDataRepository();

    return new StubTeamBillingDataRepository();
  }
}
