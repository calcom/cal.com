export type SeatChangeType = "addition" | "removal" | "sync";

export interface SeatChangeContext {
  teamId: number;
  subscriptionId: string;
  subscriptionItemId: string;
  membershipCount: number;
  changeType: SeatChangeType;
}

export interface StripeInvoiceData {
  lines: {
    data: Array<{
      metadata?: Record<string, string | null | undefined> | null;
    }>;
  };
}

export interface ISeatBillingStrategy {
  onSeatChange(context: SeatChangeContext): Promise<void>;
  onInvoiceUpcoming(subscriptionId: string): Promise<{ applied: boolean }>;
  onRenewalPaid(subscriptionId: string, periodStart: Date): Promise<{ reset: boolean }>;
  onPaymentSucceeded(invoice: StripeInvoiceData): Promise<{ handled: boolean }>;
  onPaymentFailed(invoice: StripeInvoiceData, reason: string): Promise<{ handled: boolean }>;
}

export abstract class BaseSeatBillingStrategy implements ISeatBillingStrategy {
  abstract onSeatChange(context: SeatChangeContext): Promise<void>;

  async onInvoiceUpcoming(_subscriptionId: string): Promise<{ applied: boolean }> {
    return { applied: false };
  }

  async onRenewalPaid(_subscriptionId: string, _periodStart: Date): Promise<{ reset: boolean }> {
    return { reset: false };
  }

  async onPaymentSucceeded(_invoice: StripeInvoiceData): Promise<{ handled: boolean }> {
    return { handled: false };
  }

  async onPaymentFailed(_invoice: StripeInvoiceData, _reason: string): Promise<{ handled: boolean }> {
    return { handled: false };
  }
}
