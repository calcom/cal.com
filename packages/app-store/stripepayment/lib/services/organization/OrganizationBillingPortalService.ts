import { BillingPortalService } from "../base/BillingPortalService";

export class OrganizationBillingPortalService extends BillingPortalService {
  async checkPermissions(_userId: number, _teamId: number): Promise<boolean> {
    return false;
  }

  async getCustomerId(_teamId: number): Promise<string | null> {
    return null;
  }
}
