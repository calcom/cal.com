import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SWHMap } from "./__handler";

// Mock the lazy loaded handlers
const mockOrgHandler = vi.fn().mockResolvedValue({ success: true, handled: true });
const mockTeamHandler = vi.fn().mockResolvedValue({ success: true, handled: true });

vi.mock("./_invoice.paid.org", () => ({
  default: mockOrgHandler,
}));

vi.mock("./_invoice.paid.team", () => ({
  default: mockTeamHandler,
}));

// Mock environment variables
const STRIPE_ORG_PRODUCT_ID = "org_product_123";
const STRIPE_TEAM_PRODUCT_ID = "team_product_456";

describe("invoice.paid webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  beforeEach(() => {
    // Set environment variables before importing the handler
    vi.stubEnv("STRIPE_ORG_PRODUCT_ID", STRIPE_ORG_PRODUCT_ID);
    vi.stubEnv("STRIPE_TEAM_PRODUCT_ID", STRIPE_TEAM_PRODUCT_ID);
  });

  const createInvoiceData = (
    productId?: string | null,
    hasSubscription = true
  ): SWHMap["invoice.paid"]["data"] =>
    ({
      object: {
        subscription: hasSubscription ? "sub_123" : null,
        lines: {
          data: [
            {
              price: {
                product: productId,
              },
            },
          ],
        },
      },
    }) as SWHMap["invoice.paid"]["data"];

  it("returns error message when no subscription is present", async () => {
    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const data = createInvoiceData(null, false);
    const result = await handler(data);

    expect(result).toEqual({
      success: false,
      message: "No product ID found",
    });
    expect(mockOrgHandler).not.toHaveBeenCalled();
    expect(mockTeamHandler).not.toHaveBeenCalled();
  });

  it("returns error message when no product ID is found", async () => {
    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const data = createInvoiceData(null);
    const result = await handler(data);

    expect(result).toEqual({
      success: false,
      message: "No product ID found",
    });
    expect(mockOrgHandler).not.toHaveBeenCalled();
    expect(mockTeamHandler).not.toHaveBeenCalled();
  });

  it("routes to org handler when product ID matches STRIPE_ORG_PRODUCT_ID", async () => {
    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const data = createInvoiceData(STRIPE_ORG_PRODUCT_ID);
    const result = await handler(data);

    expect(mockOrgHandler).toHaveBeenCalledWith(data);
    expect(mockTeamHandler).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, handled: true });
  });

  it("routes to team handler when product ID matches STRIPE_TEAM_PRODUCT_ID", async () => {
    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const data = createInvoiceData(STRIPE_TEAM_PRODUCT_ID);
    const result = await handler(data);

    expect(mockTeamHandler).toHaveBeenCalledWith(data);
    expect(mockOrgHandler).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, handled: true });
  });

  it("returns unhandled message when product ID does not match any known products", async () => {
    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const unknownProductId = "unknown_product_789";
    const data = createInvoiceData(unknownProductId);
    const result = await handler(data);

    expect(result).toEqual({
      success: false,
      message: `Unhandled product: ${unknownProductId}`,
    });
    expect(mockOrgHandler).not.toHaveBeenCalled();
    expect(mockTeamHandler).not.toHaveBeenCalled();
  });

  it("handles empty env vars gracefully", async () => {
    // Reset env vars to empty strings
    vi.stubEnv("STRIPE_ORG_PRODUCT_ID", "");
    vi.stubEnv("STRIPE_TEAM_PRODUCT_ID", "");

    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const data = createInvoiceData("some_product_id");
    const result = await handler(data);

    expect(result).toEqual({
      success: false,
      message: "Unhandled product: some_product_id",
    });
    expect(mockOrgHandler).not.toHaveBeenCalled();
    expect(mockTeamHandler).not.toHaveBeenCalled();
  });

  it("handles case where price object is missing", async () => {
    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const data = {
      object: {
        subscription: "sub_123",
        lines: {
          data: [{}], // No price object
        },
      },
    } as SWHMap["invoice.paid"]["data"];

    const result = await handler(data);

    expect(result).toEqual({
      success: false,
      message: "No product ID found",
    });
    expect(mockOrgHandler).not.toHaveBeenCalled();
    expect(mockTeamHandler).not.toHaveBeenCalled();
  });

  it("handles case where lines data is empty", async () => {
    // Import after env vars are set
    const handler = (await import("./_invoice.paid")).default;

    const data = {
      object: {
        subscription: "sub_123",
        lines: {
          data: [], // Empty lines
        },
      },
    } as SWHMap["invoice.paid"]["data"];

    const result = await handler(data);

    expect(result).toEqual({
      success: false,
      message: "No product ID found",
    });
    expect(mockOrgHandler).not.toHaveBeenCalled();
    expect(mockTeamHandler).not.toHaveBeenCalled();
  });
});
