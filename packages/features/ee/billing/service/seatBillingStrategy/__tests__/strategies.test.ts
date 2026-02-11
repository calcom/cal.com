import { describe, expect, it, vi } from "vitest";
import type { IBillingProviderService } from "../../billingProvider/IBillingProviderService";
import type { HighWaterMarkService } from "../../highWaterMark/HighWaterMarkService";
import type { MonthlyProrationService } from "../../proration/MonthlyProrationService";
import type { HighWaterMarkRepository } from "../../../repository/highWaterMark/HighWaterMarkRepository";
import { HighWaterMarkStrategy } from "../HighWaterMarkStrategy";
import { ImmediateUpdateStrategy } from "../ImmediateUpdateStrategy";
import type { SeatChangeContext, StripeInvoiceData } from "../ISeatBillingStrategy";
import { MonthlyProrationStrategy } from "../MonthlyProrationStrategy";

const mockContext: SeatChangeContext = {
  teamId: 1,
  subscriptionId: "sub_123",
  subscriptionItemId: "si_456",
  membershipCount: 10,
  changeType: "addition",
};

function createMockBillingProviderService(): IBillingProviderService {
  return {
    handleSubscriptionUpdate: vi.fn(),
  } as unknown as IBillingProviderService;
}

function createMockHighWaterMarkRepository(): HighWaterMarkRepository {
  return {
    getByTeamId: vi.fn(),
    updateIfHigher: vi.fn().mockResolvedValue({ updated: false, previousHighWaterMark: null }),
  } as unknown as HighWaterMarkRepository;
}

function createMockHighWaterMarkService(): HighWaterMarkService {
  return {
    applyHighWaterMarkToSubscription: vi.fn().mockResolvedValue(false),
    resetSubscriptionAfterRenewal: vi.fn().mockResolvedValue(false),
  } as unknown as HighWaterMarkService;
}

function createMockMonthlyProrationService(): MonthlyProrationService {
  return {
    handleProrationPaymentSuccess: vi.fn(),
    handleProrationPaymentFailure: vi.fn(),
  } as unknown as MonthlyProrationService;
}

describe("ImmediateUpdateStrategy", () => {
  it("calls handleSubscriptionUpdate on seat change", async () => {
    const billingProvider = createMockBillingProviderService();
    const strategy = new ImmediateUpdateStrategy(billingProvider);

    await strategy.onSeatChange(mockContext);

    expect(billingProvider.handleSubscriptionUpdate).toHaveBeenCalledWith({
      subscriptionId: "sub_123",
      subscriptionItemId: "si_456",
      membershipCount: 10,
    });
  });

  it("returns no-op for onInvoiceUpcoming", async () => {
    const strategy = new ImmediateUpdateStrategy(createMockBillingProviderService());
    expect(await strategy.onInvoiceUpcoming("sub_123")).toEqual({ applied: false });
  });

  it("returns no-op for onRenewalPaid", async () => {
    const strategy = new ImmediateUpdateStrategy(createMockBillingProviderService());
    expect(await strategy.onRenewalPaid("sub_123", new Date())).toEqual({ reset: false });
  });

  it("returns no-op for onPaymentSucceeded (inherited from base)", async () => {
    const strategy = new ImmediateUpdateStrategy(createMockBillingProviderService());
    const invoice: StripeInvoiceData = { lines: { data: [] } };
    expect(await strategy.onPaymentSucceeded(invoice)).toEqual({ handled: false });
  });

  it("returns no-op for onPaymentFailed (inherited from base)", async () => {
    const strategy = new ImmediateUpdateStrategy(createMockBillingProviderService());
    const invoice: StripeInvoiceData = { lines: { data: [] } };
    expect(await strategy.onPaymentFailed(invoice, "card_declined")).toEqual({ handled: false });
  });
});

describe("HighWaterMarkStrategy", () => {
  function createStrategy() {
    const hwmRepo = createMockHighWaterMarkRepository();
    const hwmService = createMockHighWaterMarkService();
    const strategy = new HighWaterMarkStrategy({
      highWaterMarkRepository: hwmRepo,
      highWaterMarkService: hwmService,
    });
    return { strategy, hwmRepo, hwmService };
  }

  it("updates high water mark on seat addition", async () => {
    const { strategy, hwmRepo } = createStrategy();
    vi.mocked(hwmRepo.getByTeamId).mockResolvedValue({
      subscriptionStart: new Date("2025-01-01"),
      highWaterMarkPeriodStart: new Date("2025-06-01"),
      isOrganization: false,
    });
    vi.mocked(hwmRepo.updateIfHigher).mockResolvedValue({ updated: true, previousHighWaterMark: 8 });

    await strategy.onSeatChange(mockContext);

    expect(hwmRepo.getByTeamId).toHaveBeenCalledWith(1);
    expect(hwmRepo.updateIfHigher).toHaveBeenCalledWith({
      teamId: 1,
      isOrganization: false,
      newSeatCount: 10,
      periodStart: new Date("2025-06-01"),
    });
  });

  it("uses subscriptionStart when highWaterMarkPeriodStart is null", async () => {
    const { strategy, hwmRepo } = createStrategy();
    vi.mocked(hwmRepo.getByTeamId).mockResolvedValue({
      subscriptionStart: new Date("2025-01-01"),
      highWaterMarkPeriodStart: null,
      isOrganization: false,
    });

    await strategy.onSeatChange(mockContext);

    expect(hwmRepo.updateIfHigher).toHaveBeenCalledWith(
      expect.objectContaining({ periodStart: new Date("2025-01-01") })
    );
  });

  it("skips HWM update on seat removal", async () => {
    const { strategy, hwmRepo } = createStrategy();
    await strategy.onSeatChange({ ...mockContext, changeType: "removal" });

    expect(hwmRepo.getByTeamId).not.toHaveBeenCalled();
  });

  it("skips HWM update on sync", async () => {
    const { strategy, hwmRepo } = createStrategy();
    await strategy.onSeatChange({ ...mockContext, changeType: "sync" });

    expect(hwmRepo.getByTeamId).not.toHaveBeenCalled();
  });

  it("skips HWM update when no billing record exists", async () => {
    const { strategy, hwmRepo } = createStrategy();
    vi.mocked(hwmRepo.getByTeamId).mockResolvedValue(null);

    await strategy.onSeatChange(mockContext);

    expect(hwmRepo.updateIfHigher).not.toHaveBeenCalled();
  });

  it("skips HWM update when no period start available", async () => {
    const { strategy, hwmRepo } = createStrategy();
    vi.mocked(hwmRepo.getByTeamId).mockResolvedValue({
      subscriptionStart: null,
      highWaterMarkPeriodStart: null,
      isOrganization: false,
    });

    await strategy.onSeatChange(mockContext);

    expect(hwmRepo.updateIfHigher).not.toHaveBeenCalled();
  });

  it("delegates onInvoiceUpcoming to HighWaterMarkService", async () => {
    const { strategy, hwmService } = createStrategy();
    vi.mocked(hwmService.applyHighWaterMarkToSubscription).mockResolvedValue(true);

    const result = await strategy.onInvoiceUpcoming("sub_123");

    expect(result).toEqual({ applied: true });
    expect(hwmService.applyHighWaterMarkToSubscription).toHaveBeenCalledWith("sub_123");
  });

  it("delegates onRenewalPaid to HighWaterMarkService", async () => {
    const { strategy, hwmService } = createStrategy();
    vi.mocked(hwmService.resetSubscriptionAfterRenewal).mockResolvedValue(true);
    const periodStart = new Date("2025-07-01");

    const result = await strategy.onRenewalPaid("sub_123", periodStart);

    expect(result).toEqual({ reset: true });
    expect(hwmService.resetSubscriptionAfterRenewal).toHaveBeenCalledWith({
      subscriptionId: "sub_123",
      newPeriodStart: periodStart,
    });
  });

  it("returns no-op for onPaymentSucceeded (inherited from base)", async () => {
    const { strategy } = createStrategy();
    const invoice: StripeInvoiceData = { lines: { data: [] } };
    expect(await strategy.onPaymentSucceeded(invoice)).toEqual({ handled: false });
  });

  it("returns no-op for onPaymentFailed (inherited from base)", async () => {
    const { strategy } = createStrategy();
    const invoice: StripeInvoiceData = { lines: { data: [] } };
    expect(await strategy.onPaymentFailed(invoice, "card_declined")).toEqual({ handled: false });
  });
});

describe("MonthlyProrationStrategy", () => {
  function createProrationStrategy() {
    const prorationService = createMockMonthlyProrationService();
    const strategy = new MonthlyProrationStrategy({
      monthlyProrationService: prorationService,
    });
    return { strategy, prorationService };
  }

  it("does not call any external service on seat change", async () => {
    const { strategy } = createProrationStrategy();
    await expect(strategy.onSeatChange(mockContext)).resolves.toBeUndefined();
  });

  it("returns no-op for onInvoiceUpcoming (inherited from base)", async () => {
    const { strategy } = createProrationStrategy();
    expect(await strategy.onInvoiceUpcoming("sub_123")).toEqual({ applied: false });
  });

  it("returns no-op for onRenewalPaid (inherited from base)", async () => {
    const { strategy } = createProrationStrategy();
    expect(await strategy.onRenewalPaid("sub_123", new Date())).toEqual({ reset: false });
  });

  it("handles payment succeeded for proration invoice", async () => {
    const { strategy, prorationService } = createProrationStrategy();
    const invoice: StripeInvoiceData = {
      lines: { data: [{ metadata: { type: "monthly_proration", prorationId: "pro_123" } }] },
    };

    const result = await strategy.onPaymentSucceeded(invoice);

    expect(result).toEqual({ handled: true });
    expect(prorationService.handleProrationPaymentSuccess).toHaveBeenCalledWith("pro_123");
  });

  it("returns not handled for non-proration invoice on payment succeeded", async () => {
    const { strategy, prorationService } = createProrationStrategy();
    const invoice: StripeInvoiceData = {
      lines: { data: [{ metadata: { type: "other" } }] },
    };

    const result = await strategy.onPaymentSucceeded(invoice);

    expect(result).toEqual({ handled: false });
    expect(prorationService.handleProrationPaymentSuccess).not.toHaveBeenCalled();
  });

  it("returns not handled when proration line item has no prorationId", async () => {
    const { strategy, prorationService } = createProrationStrategy();
    const invoice: StripeInvoiceData = {
      lines: { data: [{ metadata: { type: "monthly_proration" } }] },
    };

    const result = await strategy.onPaymentSucceeded(invoice);

    expect(result).toEqual({ handled: false });
    expect(prorationService.handleProrationPaymentSuccess).not.toHaveBeenCalled();
  });

  it("handles payment failed for proration invoice", async () => {
    const { strategy, prorationService } = createProrationStrategy();
    const invoice: StripeInvoiceData = {
      lines: { data: [{ metadata: { type: "monthly_proration", prorationId: "pro_456" } }] },
    };

    const result = await strategy.onPaymentFailed(invoice, "card_declined");

    expect(result).toEqual({ handled: true });
    expect(prorationService.handleProrationPaymentFailure).toHaveBeenCalledWith({
      prorationId: "pro_456",
      reason: "card_declined",
    });
  });

  it("returns not handled for non-proration invoice on payment failed", async () => {
    const { strategy, prorationService } = createProrationStrategy();
    const invoice: StripeInvoiceData = { lines: { data: [] } };

    const result = await strategy.onPaymentFailed(invoice, "card_declined");

    expect(result).toEqual({ handled: false });
    expect(prorationService.handleProrationPaymentFailure).not.toHaveBeenCalled();
  });
});
