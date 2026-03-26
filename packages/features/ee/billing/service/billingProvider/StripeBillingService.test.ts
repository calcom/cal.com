import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionStatus } from "../../repository/billing/IBillingRepository";
import { StripeBillingService } from "./StripeBillingService";

// Mock the helper function
vi.mock("../../helpers/getCheckoutSessionExpiresAt", () => ({
  getCheckoutSessionExpiresAt: vi.fn(() => 1709251200), // Fixed timestamp
}));

describe("StripeBillingService", () => {
  let stripeBillingService: StripeBillingService;
  let stripeMock: Partial<Stripe>;

  beforeEach(() => {
    stripeMock = {
      subscriptions: {
        cancel: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
        list: vi.fn(),
      } as Partial<Stripe.SubscriptionsResource>,
      checkout: {
        sessions: {
          retrieve: vi.fn(),
          create: vi.fn(),
        } as Partial<Stripe.Checkout.SessionsResource>,
      } as Partial<Stripe.CheckoutResource>,
      customers: {
        create: vi.fn(),
        retrieve: vi.fn(),
        update: vi.fn(),
      } as Partial<Stripe.CustomersResource>,
      prices: {
        create: vi.fn(),
        retrieve: vi.fn(),
      } as Partial<Stripe.PricesResource>,
      invoiceItems: {
        create: vi.fn(),
        del: vi.fn(),
      } as Partial<Stripe.InvoiceItemsResource>,
      invoices: {
        create: vi.fn(),
        finalizeInvoice: vi.fn(),
        retrieve: vi.fn(),
        voidInvoice: vi.fn(),
        del: vi.fn(),
        list: vi.fn(),
      } as Partial<Stripe.InvoicesResource>,
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(),
      } as Partial<Stripe.PaymentIntentsResource>,
      subscriptionItems: {
        createUsageRecord: vi.fn(),
      } as Partial<Stripe.SubscriptionItemsResource>,
    };
    stripeBillingService = new StripeBillingService(stripeMock as Stripe);
  });

  it("should cancel a subscription", async () => {
    const subscriptionId = "sub_123";
    await stripeBillingService.handleSubscriptionCancel(subscriptionId);
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId);
  });

  it("should update a subscription", async () => {
    const args = {
      subscriptionId: "sub_123",
      subscriptionItemId: "item_123",
      membershipCount: 5,
    };
    stripeMock.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [{ id: "item_123", quantity: 3 }],
      },
    });
    await stripeBillingService.handleSubscriptionUpdate(args);
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith(args.subscriptionId);
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(args.subscriptionId, {
      items: [{ quantity: args.membershipCount, id: args.subscriptionItemId }],
    });

    await stripeBillingService.handleSubscriptionUpdate({
      ...args,
      prorationBehavior: "none",
    });
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith(args.subscriptionId, {
      items: [{ quantity: args.membershipCount, id: args.subscriptionItemId }],
      proration_behavior: "none",
    });
  });

  it("should throw an error if subscription item is not found", async () => {
    const args = {
      subscriptionId: "sub_123",
      subscriptionItemId: "item_123",
      membershipCount: 5,
    };
    stripeMock.subscriptions.retrieve.mockResolvedValue({
      items: {
        data: [],
      },
    });
    await expect(stripeBillingService.handleSubscriptionUpdate(args)).rejects.toThrow(
      "Subscription item not found"
    );
  });

  it("should return true if checkout session is paid", async () => {
    const paymentId = "pay_123";
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "paid",
    });
    const result = await stripeBillingService.checkoutSessionIsPaid(paymentId);
    expect(result).toBe(true);
    expect(stripeMock.checkout.sessions.retrieve).toHaveBeenCalledWith(paymentId);
  });

  it("should return false if checkout session is not paid", async () => {
    const paymentId = "pay_123";
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      payment_status: "unpaid",
    });
    const result = await stripeBillingService.checkoutSessionIsPaid(paymentId);
    expect(result).toBe(false);
    expect(stripeMock.checkout.sessions.retrieve).toHaveBeenCalledWith(paymentId);
  });

  describe("createCustomer", () => {
    it("should create a customer with email and metadata", async () => {
      const args = {
        email: "test@example.com",
        metadata: { userId: "123" },
      };
      stripeMock.customers.create.mockResolvedValue({ id: "cus_123" });

      const result = await stripeBillingService.createCustomer(args);

      expect(result).toEqual({ stripeCustomerId: "cus_123" });
      expect(stripeMock.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        metadata: {
          email: "test@example.com",
          userId: "123",
        },
      });
    });
  });

  describe("createPaymentIntent", () => {
    it("should create a payment intent", async () => {
      const args = {
        customerId: "cus_123",
        amount: 1000,
        metadata: { orderId: "order_123" },
      };
      stripeMock.paymentIntents.create.mockResolvedValue({
        id: "pi_123",
        client_secret: "pi_123_secret",
      });

      const result = await stripeBillingService.createPaymentIntent(args);

      expect(result).toEqual({
        id: "pi_123",
        client_secret: "pi_123_secret",
      });
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
        customer: "cus_123",
        amount: 1000,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: { orderId: "order_123" },
      });
    });
  });

  describe("createOneTimeCheckout", () => {
    it("should create a one-time checkout session", async () => {
      const args = {
        priceId: "price_123",
        quantity: 1,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        metadata: { orderId: "order_123" },
        allowPromotionCodes: false,
      };
      stripeMock.checkout.sessions.create.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/cs_123",
        id: "cs_123",
      });

      const result = await stripeBillingService.createOneTimeCheckout(args);

      expect(result).toEqual({
        checkoutUrl: "https://checkout.stripe.com/pay/cs_123",
        sessionId: "cs_123",
      });
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith({
        line_items: [{ price: "price_123", quantity: 1 }],
        mode: "payment",
        expires_at: 1709251200,
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        metadata: { orderId: "order_123" },
        allow_promotion_codes: false,
        invoice_creation: {
          enabled: true,
        },
      });
    });

    it("should create checkout with default allowPromotionCodes", async () => {
      const args = {
        priceId: "price_123",
        quantity: 1,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };
      stripeMock.checkout.sessions.create.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/cs_123",
        id: "cs_123",
      });

      await stripeBillingService.createOneTimeCheckout(args);

      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_promotion_codes: true,
        })
      );
    });
  });

  describe("createSubscriptionCheckout", () => {
    it("should create a subscription checkout session with all options", async () => {
      const args = {
        customerId: "cus_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        priceId: "price_123",
        quantity: 1,
        metadata: { teamId: "team_123" },
        mode: "subscription" as const,
        allowPromotionCodes: false,
        customerUpdate: { address: "auto" },
        automaticTax: { enabled: true },
        discounts: [{ coupon: "coupon_123" }],
        subscriptionData: { trial_period_days: 14 },
      };
      stripeMock.checkout.sessions.create.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/cs_123",
        id: "cs_123",
      });

      const result = await stripeBillingService.createSubscriptionCheckout(args);

      expect(result).toEqual({
        checkoutUrl: "https://checkout.stripe.com/pay/cs_123",
        sessionId: "cs_123",
      });
      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        mode: "subscription",
        expires_at: 1709251200,
        metadata: { teamId: "team_123" },
        line_items: [{ price: "price_123", quantity: 1 }],
        discounts: [{ coupon: "coupon_123" }],
        customer_update: { address: "auto" },
        automatic_tax: { enabled: true },
        subscription_data: { trial_period_days: 14 },
      });
    });

    it("should create subscription checkout with promotion codes when no discounts", async () => {
      const args = {
        customerId: "cus_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        priceId: "price_123",
        quantity: 1,
      };
      stripeMock.checkout.sessions.create.mockResolvedValue({
        url: "https://checkout.stripe.com/pay/cs_123",
        id: "cs_123",
      });

      await stripeBillingService.createSubscriptionCheckout(args);

      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_promotion_codes: true,
        })
      );
    });
  });

  describe("createPrice", () => {
    it("should create a recurring price", async () => {
      const args = {
        amount: 1000,
        currency: "usd" as const,
        interval: "month" as const,
        productId: "prod_123",
        nickname: "Monthly Plan",
        metadata: { planType: "premium" },
      };
      stripeMock.prices.create.mockResolvedValue({ id: "price_123" });

      const result = await stripeBillingService.createPrice(args);

      expect(result).toEqual({ priceId: "price_123" });
      expect(stripeMock.prices.create).toHaveBeenCalledWith({
        nickname: "Monthly Plan",
        unit_amount: 1000,
        currency: "usd",
        recurring: {
          interval: "month",
        },
        product: "prod_123",
        metadata: { planType: "premium" },
      });
    });
  });

  describe("handleSubscriptionCreation", () => {
    it("should throw error for not implemented method", async () => {
      await expect(stripeBillingService.handleSubscriptionCreation("sub_123")).rejects.toThrow(
        "Method not implemented for subscription id sub_123"
      );
    });
  });

  describe("updateSubscriptionPrice", () => {
    it("should update subscription price with default proration", async () => {
      const args = {
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        newPriceId: "price_456",
      };

      await stripeBillingService.updateSubscriptionPrice(args);

      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        items: [{ id: "item_123", price: "price_456" }],
        proration_behavior: "create_prorations",
      });
    });

    it("should update subscription price with custom proration and end trial", async () => {
      const args = {
        subscriptionId: "sub_123",
        subscriptionItemId: "item_123",
        newPriceId: "price_456",
        prorationBehavior: "none" as const,
        endTrial: true,
      };

      await stripeBillingService.updateSubscriptionPrice(args);

      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        items: [{ id: "item_123", price: "price_456" }],
        proration_behavior: "none",
        trial_end: "now",
      });
    });
  });

  describe("handleEndTrial", () => {
    it("should end trial for trialing subscription", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        status: "trialing",
      });

      await stripeBillingService.handleEndTrial("sub_123");

      expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
      expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        trial_end: "now",
      });
    });

    it("should not update subscription if not trialing", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        status: "active",
      });

      await stripeBillingService.handleEndTrial("sub_123");

      expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
      expect(stripeMock.subscriptions.update).not.toHaveBeenCalled();
    });
  });

  describe("getSubscriptionStatus", () => {
    it("should return mapped subscription status", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        status: "active",
      });

      const result = await stripeBillingService.getSubscriptionStatus("sub_123");

      expect(result).toBe(SubscriptionStatus.ACTIVE);
      expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
    });

    it("should return null for missing subscription", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue(null);

      const result = await stripeBillingService.getSubscriptionStatus("sub_123");

      expect(result).toBeNull();
    });

    it("should return null for subscription without status", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({});

      const result = await stripeBillingService.getSubscriptionStatus("sub_123");

      expect(result).toBeNull();
    });
  });

  describe("getCheckoutSession", () => {
    it("should return checkout session", async () => {
      const mockSession = { id: "cs_123", payment_status: "paid" };
      stripeMock.checkout.sessions.retrieve.mockResolvedValue(mockSession);

      const result = await stripeBillingService.getCheckoutSession("cs_123");

      expect(result).toEqual(mockSession);
      expect(stripeMock.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_123");
    });
  });

  describe("getCustomer", () => {
    it("should return customer", async () => {
      const mockCustomer = { id: "cus_123", email: "test@example.com" };
      stripeMock.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await stripeBillingService.getCustomer("cus_123");

      expect(result).toEqual(mockCustomer);
      expect(stripeMock.customers.retrieve).toHaveBeenCalledWith("cus_123");
    });
  });

  describe("getSubscriptions", () => {
    it("should return customer subscriptions", async () => {
      const mockSubscriptions = [
        { id: "sub_123", status: "active" },
        { id: "sub_456", status: "canceled" },
      ];
      stripeMock.subscriptions.list.mockResolvedValue({ data: mockSubscriptions });

      const result = await stripeBillingService.getSubscriptions("cus_123");

      expect(result).toEqual(mockSubscriptions);
      expect(stripeMock.subscriptions.list).toHaveBeenCalledWith({ customer: "cus_123" });
    });
  });

  describe("updateCustomer", () => {
    it("should update customer with email and userId", async () => {
      const args = {
        customerId: "cus_123",
        email: "newemail@example.com",
        userId: 456,
      };

      await stripeBillingService.updateCustomer(args);

      expect(stripeMock.customers.update).toHaveBeenCalledWith("cus_123", {
        email: "newemail@example.com",
        metadata: {
          email: "newemail@example.com",
          userId: 456,
        },
      });
    });

    it("should update customer with only email", async () => {
      const args = {
        customerId: "cus_123",
        email: "newemail@example.com",
      };

      await stripeBillingService.updateCustomer(args);

      expect(stripeMock.customers.update).toHaveBeenCalledWith("cus_123", {
        email: "newemail@example.com",
        metadata: {
          email: "newemail@example.com",
        },
      });
    });

    it("should update customer with only userId", async () => {
      const args = {
        customerId: "cus_123",
        userId: 456,
      };

      await stripeBillingService.updateCustomer(args);

      expect(stripeMock.customers.update).toHaveBeenCalledWith("cus_123", {
        metadata: {
          userId: 456,
        },
      });
    });
  });

  describe("getPrice", () => {
    it("should return price", async () => {
      const mockPrice = { id: "price_123", unit_amount: 1000 };
      stripeMock.prices.retrieve.mockResolvedValue(mockPrice);

      const result = await stripeBillingService.getPrice("price_123");

      expect(result).toEqual(mockPrice);
      expect(stripeMock.prices.retrieve).toHaveBeenCalledWith("price_123");
    });
  });

  describe("extractSubscriptionDates", () => {
    it("should extract and convert subscription dates", () => {
      const subscription = {
        start_date: 1672531200, // Unix timestamp in seconds
        trial_end: 1675123200,
        cancel_at: 1677801600,
      };

      const result = stripeBillingService.extractSubscriptionDates(subscription);

      expect(result.subscriptionStart).toEqual(new Date(1672531200 * 1000));
      expect(result.subscriptionTrialEnd).toEqual(new Date(1675123200 * 1000));
      expect(result.subscriptionEnd).toEqual(new Date(1677801600 * 1000));
    });

    it("should handle null trial_end and cancel_at", () => {
      const subscription = {
        start_date: 1672531200,
        trial_end: null,
        cancel_at: null,
      };

      const result = stripeBillingService.extractSubscriptionDates(subscription);

      expect(result.subscriptionStart).toEqual(new Date(1672531200 * 1000));
      expect(result.subscriptionTrialEnd).toBeNull();
      expect(result.subscriptionEnd).toBeNull();
    });
  });

  describe("mapStripeStatusToCalStatus", () => {
    it("should map active status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "active",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.ACTIVE);
    });

    it("should map past_due status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "past_due",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.PAST_DUE);
    });

    it("should map canceled status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "canceled",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.CANCELLED);
    });

    it("should map cancelled status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "cancelled",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.CANCELLED);
    });

    it("should map trialing status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "trialing",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.TRIALING);
    });

    it("should map incomplete status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "incomplete",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.INCOMPLETE);
    });

    it("should map incomplete_expired status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "incomplete_expired",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.INCOMPLETE_EXPIRED);
    });

    it("should map unpaid status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "unpaid",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.UNPAID);
    });

    it("should map paused status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "paused",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.PAUSED);
    });

    it("should return ACTIVE for unknown status", () => {
      const result = stripeBillingService.mapStripeStatusToCalStatus({
        stripeStatus: "unknown_status",
        subscriptionId: "sub_123",
      });
      expect(result).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  describe("createInvoiceItem", () => {
    it("should create invoice item with all fields", async () => {
      const args = {
        customerId: "cus_123",
        amount: 1000,
        currency: "usd" as const,
        description: "Test item",
        subscriptionId: "sub_123",
        invoiceId: "in_123",
        metadata: { itemType: "addon" },
      };
      stripeMock.invoiceItems.create.mockResolvedValue({ id: "ii_123" });

      const result = await stripeBillingService.createInvoiceItem(args);

      expect(result).toEqual({ invoiceItemId: "ii_123" });
      expect(stripeMock.invoiceItems.create).toHaveBeenCalledWith({
        customer: "cus_123",
        amount: 1000,
        currency: "usd",
        description: "Test item",
        invoice: "in_123",
        subscription: "sub_123",
        metadata: { itemType: "addon" },
      });
    });
  });

  describe("deleteInvoiceItem", () => {
    it("should delete invoice item", async () => {
      await stripeBillingService.deleteInvoiceItem("ii_123");

      expect(stripeMock.invoiceItems.del).toHaveBeenCalledWith("ii_123");
    });
  });

  describe("createInvoice", () => {
    it("should create invoice with all options", async () => {
      const args = {
        customerId: "cus_123",
        autoAdvance: true,
        collectionMethod: "charge_automatically" as const,
        daysUntilDue: 30,
        pendingInvoiceItemsBehavior: "include" as const,
        subscriptionId: "sub_123",
        metadata: { invoiceType: "monthly" },
      };
      stripeMock.invoices.create.mockResolvedValue({ id: "in_123" });

      const result = await stripeBillingService.createInvoice(args);

      expect(result).toEqual({ invoiceId: "in_123" });
      expect(stripeMock.invoices.create).toHaveBeenCalledWith({
        customer: "cus_123",
        auto_advance: true,
        collection_method: "charge_automatically",
        subscription: "sub_123",
        metadata: { invoiceType: "monthly" },
      });
    });

    it("should create invoice with send_invoice collection method and days_until_due", async () => {
      const args = {
        customerId: "cus_123",
        autoAdvance: false,
        collectionMethod: "send_invoice" as const,
        daysUntilDue: 15,
        metadata: { invoiceType: "custom" },
      };
      stripeMock.invoices.create.mockResolvedValue({ id: "in_123" });

      await stripeBillingService.createInvoice(args);

      expect(stripeMock.invoices.create).toHaveBeenCalledWith({
        customer: "cus_123",
        auto_advance: false,
        collection_method: "send_invoice",
        days_until_due: 15,
        metadata: { invoiceType: "custom" },
      });
    });

    it("should use default days_until_due for send_invoice when not provided", async () => {
      const args = {
        customerId: "cus_123",
        collectionMethod: "send_invoice" as const,
      };
      stripeMock.invoices.create.mockResolvedValue({ id: "in_123" });

      await stripeBillingService.createInvoice(args);

      expect(stripeMock.invoices.create).toHaveBeenCalledWith({
        customer: "cus_123",
        collection_method: "send_invoice",
        days_until_due: 30,
      });
    });

    it("should include pendingInvoiceItemsBehavior when no subscriptionId", async () => {
      const args = {
        customerId: "cus_123",
        pendingInvoiceItemsBehavior: "exclude" as const,
      };
      stripeMock.invoices.create.mockResolvedValue({ id: "in_123" });

      await stripeBillingService.createInvoice(args);

      expect(stripeMock.invoices.create).toHaveBeenCalledWith({
        customer: "cus_123",
        pending_invoice_items_behavior: "exclude",
      });
    });
  });

  describe("finalizeInvoice", () => {
    it("should finalize invoice and return URL", async () => {
      stripeMock.invoices.finalizeInvoice.mockResolvedValue({
        hosted_invoice_url: "https://invoice.stripe.com/i/123",
      });

      const result = await stripeBillingService.finalizeInvoice("in_123");

      expect(result).toEqual({ invoiceUrl: "https://invoice.stripe.com/i/123" });
      expect(stripeMock.invoices.finalizeInvoice).toHaveBeenCalledWith("in_123");
    });

    it("should return null URL if not provided", async () => {
      stripeMock.invoices.finalizeInvoice.mockResolvedValue({
        hosted_invoice_url: null,
      });

      const result = await stripeBillingService.finalizeInvoice("in_123");

      expect(result).toEqual({ invoiceUrl: null });
    });
  });

  describe("voidInvoice", () => {
    it("should void open invoice", async () => {
      stripeMock.invoices.retrieve.mockResolvedValue({
        status: "open",
      });

      await stripeBillingService.voidInvoice("in_123");

      expect(stripeMock.invoices.retrieve).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.voidInvoice).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.del).not.toHaveBeenCalled();
    });

    it("should void uncollectible invoice", async () => {
      stripeMock.invoices.retrieve.mockResolvedValue({
        status: "uncollectible",
      });

      await stripeBillingService.voidInvoice("in_123");

      expect(stripeMock.invoices.retrieve).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.voidInvoice).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.del).not.toHaveBeenCalled();
    });

    it("should delete draft invoice", async () => {
      stripeMock.invoices.retrieve.mockResolvedValue({
        status: "draft",
      });

      await stripeBillingService.voidInvoice("in_123");

      expect(stripeMock.invoices.retrieve).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.del).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.voidInvoice).not.toHaveBeenCalled();
    });

    it("should do nothing for paid invoice", async () => {
      stripeMock.invoices.retrieve.mockResolvedValue({
        status: "paid",
      });

      await stripeBillingService.voidInvoice("in_123");

      expect(stripeMock.invoices.retrieve).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.voidInvoice).not.toHaveBeenCalled();
      expect(stripeMock.invoices.del).not.toHaveBeenCalled();
    });

    it("should do nothing for void invoice", async () => {
      stripeMock.invoices.retrieve.mockResolvedValue({
        status: "void",
      });

      await stripeBillingService.voidInvoice("in_123");

      expect(stripeMock.invoices.retrieve).toHaveBeenCalledWith("in_123");
      expect(stripeMock.invoices.voidInvoice).not.toHaveBeenCalled();
      expect(stripeMock.invoices.del).not.toHaveBeenCalled();
    });

    it("should throw error if retrieve fails", async () => {
      const error = new Error("Retrieve failed");
      stripeMock.invoices.retrieve.mockRejectedValue(error);

      await expect(stripeBillingService.voidInvoice("in_123")).rejects.toThrow("Retrieve failed");
    });
  });

  describe("getPaymentIntentFailureReason", () => {
    it("should return failure reason when available", async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        last_payment_error: {
          message: "Your card was declined.",
        },
      });

      const result = await stripeBillingService.getPaymentIntentFailureReason("pi_123");

      expect(result).toBe("Your card was declined.");
      expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith("pi_123");
    });

    it("should return null when no failure reason", async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        last_payment_error: null,
      });

      const result = await stripeBillingService.getPaymentIntentFailureReason("pi_123");

      expect(result).toBeNull();
    });

    it("should return null on retrieve error", async () => {
      stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error("Not found"));

      const result = await stripeBillingService.getPaymentIntentFailureReason("pi_123");

      expect(result).toBeNull();
    });
  });

  describe("hasDefaultPaymentMethod", () => {
    it("should return true when subscription has default payment method string", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        default_payment_method: "pm_123",
      });

      const result = await stripeBillingService.hasDefaultPaymentMethod({
        customerId: "cus_123",
        subscriptionId: "sub_123",
      });

      expect(result).toBe(true);
      expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
    });

    it("should return true when subscription has default payment method object", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        default_payment_method: { id: "pm_123" },
      });

      const result = await stripeBillingService.hasDefaultPaymentMethod({
        customerId: "cus_123",
        subscriptionId: "sub_123",
      });

      expect(result).toBe(true);
    });

    it("should check customer default when subscription has no default", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        default_payment_method: null,
      });
      stripeMock.customers.retrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: {
          default_payment_method: "pm_456",
        },
      });

      const result = await stripeBillingService.hasDefaultPaymentMethod({
        customerId: "cus_123",
        subscriptionId: "sub_123",
      });

      expect(result).toBe(true);
      expect(stripeMock.customers.retrieve).toHaveBeenCalledWith("cus_123");
    });

    it("should check customer default when subscription has object default", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        default_payment_method: { id: "pm_123" },
      });
      stripeMock.customers.retrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: {
          default_payment_method: { id: "pm_456" },
        },
      });

      const result = await stripeBillingService.hasDefaultPaymentMethod({
        customerId: "cus_123",
        subscriptionId: "sub_123",
      });

      expect(result).toBe(true);
    });

    it("should return false when customer is deleted", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        default_payment_method: null,
      });
      stripeMock.customers.retrieve.mockResolvedValue({
        deleted: true,
      });

      const result = await stripeBillingService.hasDefaultPaymentMethod({
        customerId: "cus_123",
        subscriptionId: "sub_123",
      });

      expect(result).toBe(false);
    });

    it("should return false when no payment methods found", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        default_payment_method: null,
      });
      stripeMock.customers.retrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: {},
      });

      const result = await stripeBillingService.hasDefaultPaymentMethod({
        customerId: "cus_123",
        subscriptionId: "sub_123",
      });

      expect(result).toBe(false);
    });

    it("should check customer only when no subscriptionId", async () => {
      stripeMock.customers.retrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: {
          default_payment_method: "pm_456",
        },
      });

      const result = await stripeBillingService.hasDefaultPaymentMethod({
        customerId: "cus_123",
      });

      expect(result).toBe(true);
      expect(stripeMock.subscriptions.retrieve).not.toHaveBeenCalled();
      expect(stripeMock.customers.retrieve).toHaveBeenCalledWith("cus_123");
    });
  });

  describe("createSubscriptionUsageRecord", () => {
    it("should create usage record for metered subscription", async () => {
      const args = {
        subscriptionId: "sub_123",
        action: "set" as const,
        quantity: 100,
      };
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              id: "item_123",
              price: {
                recurring: {
                  usage_type: "metered",
                },
              },
            },
          ],
        },
      });

      await stripeBillingService.createSubscriptionUsageRecord(args);

      expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
      expect(stripeMock.subscriptionItems.createUsageRecord).toHaveBeenCalledWith("item_123", {
        action: "set",
        quantity: 100,
        timestamp: "now",
      });
    });

    it("should throw error if subscription not found", async () => {
      const args = {
        subscriptionId: "sub_123",
        action: "set" as const,
        quantity: 100,
      };
      stripeMock.subscriptions.retrieve.mockResolvedValue(null);

      await expect(stripeBillingService.createSubscriptionUsageRecord(args)).rejects.toThrow(
        "Failed to retrieve stripe subscription (sub_123)"
      );
    });

    it("should throw error if subscription is not usage-based", async () => {
      const args = {
        subscriptionId: "sub_123",
        action: "set" as const,
        quantity: 100,
      };
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        id: "sub_123",
        items: {
          data: [
            {
              id: "item_123",
              price: {
                recurring: {
                  usage_type: "licensed",
                },
              },
            },
          ],
        },
      });

      await expect(stripeBillingService.createSubscriptionUsageRecord(args)).rejects.toThrow(
        "Stripe subscription (sub_123) is not usage based"
      );
    });
  });

  describe("getSubscription", () => {
    it("should return formatted subscription data", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        items: {
          data: [
            {
              id: "item_123",
              quantity: 1,
              price: {
                unit_amount: 1000,
                recurring: { interval: "month" },
              },
            },
          ],
        },
        customer: "cus_123",
        status: "active",
        current_period_start: 1672531200,
        current_period_end: 1675123200,
        trial_end: null,
      });

      const result = await stripeBillingService.getSubscription("sub_123");

      expect(result).toEqual({
        items: [
          {
            id: "item_123",
            quantity: 1,
            price: {
              unit_amount: 1000,
              recurring: { interval: "month" },
            },
          },
        ],
        customer: "cus_123",
        status: "active",
        current_period_start: 1672531200,
        current_period_end: 1675123200,
        trial_end: null,
      });
    });

    it("should return null for missing subscription", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue(null);

      const result = await stripeBillingService.getSubscription("sub_123");

      expect(result).toBeNull();
    });

    it("should handle missing quantity", async () => {
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        items: {
          data: [
            {
              id: "item_123",
              quantity: null,
              price: {
                unit_amount: 1000,
                recurring: { interval: "month" },
              },
            },
          ],
        },
        customer: "cus_123",
        status: "active",
        current_period_start: 1672531200,
        current_period_end: 1675123200,
        trial_end: null,
      });

      const result = await stripeBillingService.getSubscription("sub_123");

      expect(result?.items[0].quantity).toBe(0);
    });
  });

  describe("listInvoices", () => {
    it("should list invoices with all parameters", async () => {
      const args = {
        customerId: "cus_123",
        subscriptionId: "sub_123",
        limit: 10,
        startingAfter: "in_456",
        createdGte: 1672531200,
        createdLte: 1675123200,
      };
      stripeMock.invoices.list.mockResolvedValue({
        data: [
          {
            id: "in_123",
            number: "001",
            created: 1672531200,
            amount_due: 1000,
            amount_paid: 1000,
            currency: "usd",
            status: "paid",
            hosted_invoice_url: "https://invoice.stripe.com/i/123",
            invoice_pdf: "https://files.stripe.com/invoice.pdf",
            lines: {
              data: [
                {
                  id: "line_123",
                  description: "Monthly subscription",
                  amount: 1000,
                  quantity: 1,
                },
              ],
            },
            description: "Invoice for subscription",
            default_payment_method: {
              id: "pm_123",
              type: "card",
              card: {
                last4: "4242",
                brand: "visa",
              },
            },
          },
        ],
        has_more: false,
      });

      const result = await stripeBillingService.listInvoices(args);

      expect(result).toEqual({
        invoices: [
          {
            id: "in_123",
            number: "001",
            created: 1672531200,
            amountDue: 1000,
            amountPaid: 1000,
            currency: "usd",
            status: "paid",
            hostedInvoiceUrl: "https://invoice.stripe.com/i/123",
            invoicePdf: "https://files.stripe.com/invoice.pdf",
            lineItems: [
              {
                id: "line_123",
                description: "Monthly subscription",
                amount: 1000,
                quantity: 1,
              },
            ],
            description: "Invoice for subscription",
            paymentMethod: {
              type: "card",
              card: {
                last4: "4242",
                brand: "visa",
              },
            },
          },
        ],
        hasMore: false,
      });
      expect(stripeMock.invoices.list).toHaveBeenCalledWith({
        customer: "cus_123",
        subscription: "sub_123",
        limit: 10,
        starting_after: "in_456",
        expand: ["data.default_payment_method"],
        created: {
          gte: 1672531200,
          lte: 1675123200,
        },
      });
    });

    it("should list invoices without optional parameters", async () => {
      const args = {
        customerId: "cus_123",
        limit: 5,
      };
      stripeMock.invoices.list.mockResolvedValue({
        data: [],
        has_more: true,
      });

      const result = await stripeBillingService.listInvoices(args);

      expect(result).toEqual({
        invoices: [],
        hasMore: true,
      });
      expect(stripeMock.invoices.list).toHaveBeenCalledWith({
        customer: "cus_123",
        subscription: undefined,
        limit: 5,
        starting_after: undefined,
        expand: ["data.default_payment_method"],
      });
    });

    it("should handle null invoice URLs and payment method", async () => {
      stripeMock.invoices.list.mockResolvedValue({
        data: [
          {
            id: "in_123",
            number: "001",
            created: 1672531200,
            amount_due: 1000,
            amount_paid: 0,
            currency: "usd",
            status: "open",
            hosted_invoice_url: null,
            invoice_pdf: null,
            lines: {
              data: [],
            },
            description: null,
            default_payment_method: null,
          },
        ],
        has_more: false,
      });

      const result = await stripeBillingService.listInvoices({
        customerId: "cus_123",
        limit: 1,
      });

      expect(result.invoices[0].hostedInvoiceUrl).toBeNull();
      expect(result.invoices[0].invoicePdf).toBeNull();
      expect(result.invoices[0].paymentMethod).toBeNull();
    });

    it("should handle string payment method", async () => {
      stripeMock.invoices.list.mockResolvedValue({
        data: [
          {
            id: "in_123",
            number: "001",
            created: 1672531200,
            amount_due: 1000,
            amount_paid: 1000,
            currency: "usd",
            status: "paid",
            hosted_invoice_url: "https://invoice.stripe.com/i/123",
            invoice_pdf: "https://files.stripe.com/invoice.pdf",
            lines: {
              data: [],
            },
            description: null,
            default_payment_method: "pm_123", // String instead of object
          },
        ],
        has_more: false,
      });

      const result = await stripeBillingService.listInvoices({
        customerId: "cus_123",
        limit: 1,
      });

      expect(result.invoices[0].paymentMethod).toBeNull();
    });
  });
});
