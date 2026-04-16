// Organizations are not available in community edition
// Only getBookerBaseUrlSync is kept as it's used for URL generation

import process from "node:process";
export function getBookerBaseUrlSync(_orgSlug: string | null): string {
  return process.env.NEXT_PUBLIC_WEBAPP_URL || "https://app.cal.com";
}

// Stub billing service for API v2 — org billing removed in community edition
class ActiveUserBillingServiceStub {
  async getActiveUserCountForPlatformOrg(
    _subscriptionId: string,
    _invoiceStart: Date,
    _invoiceEnd: Date
  ): Promise<number> {
    return 0;
  }
}

const activeUserBillingServiceStub = new ActiveUserBillingServiceStub();

export function getActiveUserBillingService(): ActiveUserBillingServiceStub {
  return activeUserBillingServiceStub;
}
