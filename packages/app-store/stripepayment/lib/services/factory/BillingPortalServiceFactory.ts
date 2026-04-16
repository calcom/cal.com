import { UserBillingPortalService } from "../user/UserBillingPortalService";

export class BillingPortalServiceFactory {
  static createUserService(): UserBillingPortalService {
    return new UserBillingPortalService();
  }
}
