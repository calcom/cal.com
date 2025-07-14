export interface HrmsService {
  createOOO(params: {
    startDate: string;
    endDate: string;
    notes?: string;
    userEmail: string;
  }): Promise<{ id: string }>;
  updateOOO(
    externalId: string,
    params: {
      startDate?: string;
      endDate?: string;
      notes?: string;
    }
  ): Promise<void>;
  deleteOOO(externalId: string): Promise<void>;
  listOOOReasons(userEmail: string): Promise<{ id: string; name: string }[]>;
}

export type HrmsServiceClass = Class<HrmsService>;
