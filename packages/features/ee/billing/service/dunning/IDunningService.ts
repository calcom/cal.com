import type { DunningState, DunningStatus } from "./DunningState";

export interface PaymentFailedParams {
  billingId: string;
  subscriptionId: string;
  failedInvoiceId: string;
  invoiceUrl: string | null;
  failureReason: string;
}

export interface IDunningService {
  onPaymentFailed(params: PaymentFailedParams): Promise<{ isNewDunningRecord: boolean }>;
  onPaymentSucceeded(billingId: string): Promise<void>;
  getBillingIdsToAdvance(): Promise<string[]>;
  advanceDunning(billingId: string): Promise<{ advanced: boolean; from?: DunningStatus; to?: DunningStatus }>;
  getStatus(billingId: string): Promise<DunningStatus>;
  findRecord(billingId: string): Promise<DunningState | null>;
}
