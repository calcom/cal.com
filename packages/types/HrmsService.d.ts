export interface HrmsService {
  createOOO(params: {
    startDate: string;
    endDate: string;
    notes?: string;
    userEmail: string;
  }): Promise<{ id: string }>;
  updateOOO(
    timeOffId: string,
    params: {
      startDate?: string;
      endDate?: string;
      notes?: string;
    }
  ): Promise<void>;
  deleteOOO(timeOffId: string): Promise<void>;
}

export type HrmsServiceClass = Class<HrmsService>;
