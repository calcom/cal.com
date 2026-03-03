import logger from "@calcom/lib/logger";
import type {
  ISeatBillingStrategy,
  SeatChangeContext,
  StripeInvoiceData,
} from "../seatBillingStrategy/ISeatBillingStrategy";
import { BaseSeatBillingStrategy } from "../seatBillingStrategy/ISeatBillingStrategy";
import type { IDunningService } from "./IDunningService";

const log = logger.getSubLogger({ prefix: ["DunningAwareStrategy"] });

export interface IDunningAwareStrategyDeps {
  inner: ISeatBillingStrategy;
  dunningService: IDunningService;
  billingId: string;
  teamId: number;
  subscriptionId: string;
}

export class DunningAwareStrategy extends BaseSeatBillingStrategy {
  readonly strategyName: string;

  constructor(private readonly deps: IDunningAwareStrategyDeps) {
    super();
    this.strategyName = `Dunning(${deps.inner.strategyName})`;
  }

  async onSeatChange(context: SeatChangeContext): Promise<void> {
    return this.deps.inner.onSeatChange(context);
  }

  async onInvoiceUpcoming(subscriptionId: string): Promise<{ applied: boolean }> {
    return this.deps.inner.onInvoiceUpcoming(subscriptionId);
  }

  async onRenewalPaid(subscriptionId: string, periodStart: Date): Promise<{ reset: boolean }> {
    return this.deps.inner.onRenewalPaid(subscriptionId, periodStart);
  }

  async onPaymentFailed(invoice: StripeInvoiceData, reason: string): Promise<{ handled: boolean }> {
    try {
      await this.deps.dunningService.onPaymentFailed({
        billingId: this.deps.billingId,
        subscriptionId: this.deps.subscriptionId,
        failedInvoiceId: invoice.id ?? "",
        invoiceUrl: invoice.hosted_invoice_url ?? null,
        failureReason: reason,
      });
    } catch (error) {
      log.error("Failed to update dunning state on payment failure", { teamId: this.deps.teamId, error });
    }

    return this.deps.inner.onPaymentFailed(invoice, reason);
  }

  async onPaymentSucceeded(invoice: StripeInvoiceData): Promise<{ handled: boolean }> {
    try {
      await this.deps.dunningService.onPaymentSucceeded(this.deps.billingId);
    } catch (error) {
      log.error("Failed to update dunning state on payment success", { teamId: this.deps.teamId, error });
    }

    return this.deps.inner.onPaymentSucceeded(invoice);
  }
}
