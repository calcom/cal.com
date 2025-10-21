import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, test, vi, expect, beforeEach, afterEach } from "vitest";

import * as customerModule from "@calcom/app-store/stripepayment/lib/customer";

import { deleteUser } from "./deleteUser";

vi.mock("@calcom/prisma", () => ({
  default: prismock,
}));

vi.mock("@calcom/app-store/stripepayment/lib/customer", async () => {
  const actual = await vi.importActual<typeof customerModule>("@calcom/app-store/stripepayment/lib/customer");
  return {
    ...actual,
    deleteStripeCustomer: vi.fn().mockResolvedValue("cus_123"),
    disconnectStripeConnectAccount: vi.fn().mockResolvedValue(undefined),
  };
});

describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("Should disconnect Stripe Connect accounts before deleting user", async () => {
    const user = await prismock.user.create({
      data: {
        email: "test@example.com",
        username: "testuser",
        metadata: {},
      },
    });

    await prismock.credential.create({
      data: {
        type: "stripe_payment",
        key: {
          stripe_user_id: "acct_123456",
          default_currency: "usd",
          stripe_publishable_key: "pk_test_123",
        },
        userId: user.id,
        appId: "stripe",
      },
    });

    await deleteUser(user);

    expect(customerModule.disconnectStripeConnectAccount).toHaveBeenCalledWith("acct_123456");
    expect(customerModule.deleteStripeCustomer).toHaveBeenCalledWith(user);

    const deletedUser = await prismock.user.findUnique({
      where: { id: user.id },
    });
    expect(deletedUser).toBeNull();
  });

  test("Should handle multiple Stripe Connect accounts", async () => {
    const user = await prismock.user.create({
      data: {
        email: "test2@example.com",
        username: "testuser2",
        metadata: {},
      },
    });

    await prismock.credential.create({
      data: {
        type: "stripe_payment",
        key: {
          stripe_user_id: "acct_111111",
          default_currency: "usd",
          stripe_publishable_key: "pk_test_111",
        },
        userId: user.id,
        appId: "stripe",
      },
    });

    await prismock.credential.create({
      data: {
        type: "stripe_payment",
        key: {
          stripe_user_id: "acct_222222",
          default_currency: "eur",
          stripe_publishable_key: "pk_test_222",
        },
        userId: user.id,
        appId: "stripe",
      },
    });

    await deleteUser(user);

    expect(customerModule.disconnectStripeConnectAccount).toHaveBeenCalledTimes(2);
    expect(customerModule.disconnectStripeConnectAccount).toHaveBeenCalledWith("acct_111111");
    expect(customerModule.disconnectStripeConnectAccount).toHaveBeenCalledWith("acct_222222");
  });

  test("Should delete user even if no Stripe Connect accounts exist", async () => {
    const user = await prismock.user.create({
      data: {
        email: "test3@example.com",
        username: "testuser3",
        metadata: {},
      },
    });

    await deleteUser(user);

    expect(customerModule.disconnectStripeConnectAccount).not.toHaveBeenCalled();
    expect(customerModule.deleteStripeCustomer).toHaveBeenCalledWith(user);

    const deletedUser = await prismock.user.findUnique({
      where: { id: user.id },
    });
    expect(deletedUser).toBeNull();
  });

  test("Should continue deletion even if Stripe Connect disconnect fails", async () => {
    const disconnectError = new Error("Stripe API error");
    vi.mocked(customerModule.disconnectStripeConnectAccount).mockRejectedValueOnce(disconnectError);

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const user = await prismock.user.create({
      data: {
        email: "test4@example.com",
        username: "testuser4",
        metadata: {},
      },
    });

    await prismock.credential.create({
      data: {
        type: "stripe_payment",
        key: {
          stripe_user_id: "acct_error",
          default_currency: "usd",
          stripe_publishable_key: "pk_test_error",
        },
        userId: user.id,
        appId: "stripe",
      },
    });

    await deleteUser(user);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to disconnect Stripe Connect account:",
      disconnectError
    );

    const deletedUser = await prismock.user.findUnique({
      where: { id: user.id },
    });
    expect(deletedUser).toBeNull();

    consoleWarnSpy.mockRestore();
  });

  test("Should handle credentials without stripe_user_id", async () => {
    const user = await prismock.user.create({
      data: {
        email: "test5@example.com",
        username: "testuser5",
        metadata: {},
      },
    });

    await prismock.credential.create({
      data: {
        type: "stripe_payment",
        key: {
          default_currency: "usd",
          stripe_publishable_key: "pk_test_123",
        },
        userId: user.id,
        appId: "stripe",
      },
    });

    await deleteUser(user);

    expect(customerModule.disconnectStripeConnectAccount).not.toHaveBeenCalled();
    expect(customerModule.deleteStripeCustomer).toHaveBeenCalledWith(user);

    const deletedUser = await prismock.user.findUnique({
      where: { id: user.id },
    });
    expect(deletedUser).toBeNull();
  });
});
