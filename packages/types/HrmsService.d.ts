export interface HrmsService {
  createOOO(): Promise<void>;
}

export type HrmsServiceClass = Class<HrmsService>;
