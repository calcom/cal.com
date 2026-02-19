import "@calcom/lib/__mocks__/logger";

import {
  getGlobalBlockingService,
  getOrganizationBlockingService,
} from "@calcom/features/di/watchlist/containers/watchlist";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRoutingFormBlocklist } from "./checkRoutingFormBlocklist";

vi.mock("@calcom/features/di/watchlist/containers/watchlist", () => ({
  getGlobalBlockingService: vi.fn(),
  getOrganizationBlockingService: vi.fn(),
}));

const mockGlobalBlockingService = {
  areBlocked: vi.fn(),
  isBlocked: vi.fn(),
};

const mockOrgBlockingService = {
  areBlocked: vi.fn(),
  isBlocked: vi.fn(),
};

describe("checkRoutingFormBlocklist", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getGlobalBlockingService).mockReturnValue(mockGlobalBlockingService as never);
    vi.mocked(getOrganizationBlockingService).mockReturnValue(mockOrgBlockingService as never);
  });

  it("returns isBlocked: false when emails array is empty", async () => {
    const result = await checkRoutingFormBlocklist({ emails: [], orgId: null });

    expect(result).toEqual({ isBlocked: false });
    expect(getGlobalBlockingService).not.toHaveBeenCalled();
  });

  it("returns isBlocked: true when global blocking service reports blocked", async () => {
    mockGlobalBlockingService.areBlocked.mockResolvedValue(
      new Map([["blocked@spam.com", { isBlocked: true, reason: "EMAIL" }]])
    );

    const result = await checkRoutingFormBlocklist({
      emails: ["blocked@spam.com"],
      orgId: null,
    });

    expect(result).toEqual({ isBlocked: true });
    expect(mockGlobalBlockingService.areBlocked).toHaveBeenCalledWith(["blocked@spam.com"]);
  });

  it("returns isBlocked: true when org blocking service reports blocked", async () => {
    mockGlobalBlockingService.areBlocked.mockResolvedValue(
      new Map([["user@blocked.org", { isBlocked: false }]])
    );
    mockOrgBlockingService.areBlocked.mockResolvedValue(
      new Map([["user@blocked.org", { isBlocked: true, reason: "DOMAIN" }]])
    );

    const result = await checkRoutingFormBlocklist({
      emails: ["user@blocked.org"],
      orgId: 42,
    });

    expect(result).toEqual({ isBlocked: true });
    expect(mockOrgBlockingService.areBlocked).toHaveBeenCalledWith(["user@blocked.org"], 42);
  });

  it("returns isBlocked: false when no blocking result", async () => {
    mockGlobalBlockingService.areBlocked.mockResolvedValue(
      new Map([["safe@example.com", { isBlocked: false }]])
    );

    const result = await checkRoutingFormBlocklist({
      emails: ["safe@example.com"],
      orgId: null,
    });

    expect(result).toEqual({ isBlocked: false });
  });

  it("skips org check when orgId is null", async () => {
    mockGlobalBlockingService.areBlocked.mockResolvedValue(
      new Map([["user@example.com", { isBlocked: false }]])
    );

    await checkRoutingFormBlocklist({ emails: ["user@example.com"], orgId: null });

    expect(getOrganizationBlockingService).not.toHaveBeenCalled();
    expect(mockOrgBlockingService.areBlocked).not.toHaveBeenCalled();
  });

  it("checks both global and org when orgId is provided", async () => {
    mockGlobalBlockingService.areBlocked.mockResolvedValue(
      new Map([["user@example.com", { isBlocked: false }]])
    );
    mockOrgBlockingService.areBlocked.mockResolvedValue(
      new Map([["user@example.com", { isBlocked: false }]])
    );

    const result = await checkRoutingFormBlocklist({
      emails: ["user@example.com"],
      orgId: 10,
    });

    expect(result).toEqual({ isBlocked: false });
    expect(mockGlobalBlockingService.areBlocked).toHaveBeenCalledWith(["user@example.com"]);
    expect(mockOrgBlockingService.areBlocked).toHaveBeenCalledWith(["user@example.com"], 10);
  });

  it("returns isBlocked: true if any email in a multi-email check is blocked", async () => {
    mockGlobalBlockingService.areBlocked.mockResolvedValue(
      new Map([
        ["safe@example.com", { isBlocked: false }],
        ["blocked@spam.com", { isBlocked: true, reason: "EMAIL" }],
      ])
    );

    const result = await checkRoutingFormBlocklist({
      emails: ["safe@example.com", "blocked@spam.com"],
      orgId: null,
    });

    expect(result).toEqual({ isBlocked: true });
  });

  it("returns isBlocked: false on service error (fail-open)", async () => {
    mockGlobalBlockingService.areBlocked.mockRejectedValue(new Error("DB connection failed"));

    const result = await checkRoutingFormBlocklist({
      emails: ["user@example.com"],
      orgId: null,
    });

    expect(result).toEqual({ isBlocked: false });
  });
});
