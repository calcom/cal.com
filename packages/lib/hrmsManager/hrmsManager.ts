import { getHrmsService } from "@calcom/app-store/_utils/getHrms";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { HrmsService } from "@calcom/types/HrmsService";

export default class HrmsManager {
  private credential: CredentialPayload;
  private hrmsService: HrmsService | null = null;

  constructor(credential: CredentialPayload) {
    this.credential = credential;
  }

  private async getHrmsService(): Promise<HrmsService> {
    if (!this.hrmsService) {
      this.hrmsService = await getHrmsService({ credential: this.credential });
      if (!this.hrmsService) {
        throw new Error("HRMS service not found");
      }
    }
    return this.hrmsService;
  }

  async createOOO(params: {
    startDate: string;
    endDate: string;
    userEmail: string;
    notes?: string;
    externalReasonId: string;
  }): Promise<{ id: string } | null> {
    const hrmsService = await this.getHrmsService();
    if (!hrmsService) return null;
    return hrmsService.createOOO(params);
  }

  async updateOOO(
    externalId: string,
    params: {
      startDate?: string;
      endDate?: string;
      notes?: string;
      externalReasonId?: string;
      userEmail: string;
    }
  ): Promise<void> {
    const hrmsService = await this.getHrmsService();
    return hrmsService.updateOOO(externalId, params);
  }

  async deleteOOO(externalId: string): Promise<void> {
    const hrmsService = await this.getHrmsService();
    return hrmsService.deleteOOO(externalId);
  }

  async listOOOReasons(userEmail: string): Promise<{ id: number; name: string; externalId: string }[]> {
    const hrmsService = await this.getHrmsService();
    return hrmsService.listOOOReasons(userEmail);
  }
}
