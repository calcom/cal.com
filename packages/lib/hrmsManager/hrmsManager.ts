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
  }): Promise<{ id: string } | null> {
    const hrmsService = await this.getHrmsService();
    if (!hrmsService) return null;
    return hrmsService.createOOO(params);
  }

  async updateOOO(
    timeOffId: string,
    params: {
      startDate?: string;
      endDate?: string;
      notes?: string;
    }
  ): Promise<void> {
    const hrmsService = await this.getHrmsService();
    return hrmsService.updateOOO(timeOffId, params);
  }

  async deleteOOO(timeOffId: string): Promise<void> {
    const hrmsService = await this.getHrmsService();
    return hrmsService.deleteOOO(timeOffId);
  }
}
