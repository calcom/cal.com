import type { DunningStatus } from "@calcom/prisma/client";

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
}
