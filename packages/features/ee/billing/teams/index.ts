/**
 * Compatibility barrel export for tests that use the old TeamBilling static API.
 * This module exports stub functions that are meant to be mocked in tests.
 * 
 * In production code, use the DI container to get TeamBillingServiceFactory instead.
 */

export const TeamBilling = {
  async findAndInit(_teamId: number) {
    throw new Error(
      "TeamBilling.findAndInit is deprecated. Use DI container to get TeamBillingServiceFactory instead."
    );
  },

  async findAndInitMany(_teamIds: number[]) {
    throw new Error(
      "TeamBilling.findAndInitMany is deprecated. Use DI container to get TeamBillingServiceFactory instead."
    );
  },
};
