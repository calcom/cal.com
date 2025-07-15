export interface HrmsService {
  createOOO(params: {
    startDate: string;
    endDate: string;
    notes?: string;
    userEmail: string;
    externalReasonId: string;
  }): Promise<{ id: string }>;
  updateOOO(
    externalId: string,
    params: {
      startDate?: string;
      endDate?: string;
      notes?: string;
      externalReasonId?: string;
      userEmail: string;
    }
  ): Promise<void>;
  deleteOOO(externalId: string): Promise<void>;
  listOOOReasons(userEmail: string): Promise<{ id: number; name: string; externalId: string }[]>;
}

export type HrmsServiceClass = Class<HrmsService>;
