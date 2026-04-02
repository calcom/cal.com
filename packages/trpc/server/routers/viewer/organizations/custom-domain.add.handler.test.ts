import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@calcom/features/custom-domains/di/custom-domain-service.container", () => ({
  getCustomDomainService: vi.fn(),
}));

import { getCustomDomainService } from "@calcom/features/custom-domains/di/custom-domain-service.container";

import { addHandler } from "./custom-domain.add.handler";

const mockAddDomain = vi.fn();

function createMockCtx(organizationId: number) {
  return {
    user: { id: 1, organizationId } as any,
    organizationId,
  };
}

describe("addHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCustomDomainService).mockReturnValue({
      addDomain: mockAddDomain,
    } as any);
  });

  it("passes organizationId from ctx to service.addDomain", async () => {
    const ctx = createMockCtx(100);
    mockAddDomain.mockResolvedValue({ id: "domain-1", slug: "app.example.com" });

    await addHandler({ ctx, input: { slug: "app.example.com" } });

    expect(mockAddDomain).toHaveBeenCalledWith({ teamId: 100, slug: "app.example.com" });
  });

  it("returns service result on success", async () => {
    const ctx = createMockCtx(100);
    const expected = { id: "domain-1", slug: "app.example.com", verified: false };
    mockAddDomain.mockResolvedValue(expected);

    const result = await addHandler({ ctx, input: { slug: "app.example.com" } });

    expect(result).toEqual(expected);
  });

  it("propagates service errors (does not swallow)", async () => {
    const ctx = createMockCtx(100);
    mockAddDomain.mockRejectedValue(new Error("Domain is already in use"));

    await expect(
      addHandler({ ctx, input: { slug: "taken.example.com" } })
    ).rejects.toThrow("Domain is already in use");
  });
});
