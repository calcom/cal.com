import type { DunningRecordForBilling } from "./DunningMapper";
import type { DunningState, DunningStatus } from "./DunningState";

export interface PaymentFailedParams {
  billingId: string;
  subscriptionId: string;
  failedInvoiceId: string;
  invoiceUrl: string | null;
  failureReason: string;
}

export interface DunningBannerRecord {
  teamId: number;
  teamName: string;
  isOrganization: boolean;
  status: string;
  isEnterprise: boolean;
  invoiceUrl: string | null;
}

export interface IDunningService {
  onPaymentFailed(params: PaymentFailedParams): Promise<{ isNewDunningRecord: boolean }>;
  onPaymentSucceeded(billingId: string): Promise<void>;
  getBillingIdsToAdvance(): Promise<string[]>;
  advanceDunning(billingId: string): Promise<{ advanced: boolean; from?: DunningStatus; to?: DunningStatus }>;
  getStatus(billingId: string): Promise<DunningStatus>;
  findRecord(billingId: string): Promise<DunningState | null>;
  findByBillingIds(billingIds: string[]): Promise<DunningRecordForBilling[]>;
  getBannerData(billingIds: string[]): Promise<DunningBannerRecord[]>;
}
