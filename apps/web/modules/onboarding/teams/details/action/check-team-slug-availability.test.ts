import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
  headers: vi.fn().mockResolvedValue({}),
}));

vi.mock("@calcom/features/auth/lib/getServerSession", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 1, profile: { organizationId: null } },
  }),
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn(),
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: { findFirst: vi.fn().mockResolvedValue(null) },
    profile: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock("@calcom/lib/constants", () => ({
  RESERVED_SUBDOMAINS: ["app", "auth", "docs", "www", "team"],
}));

import { checkTeamSlugAvailability } from "./check-team-slug-availability";

describe("checkTeamSlugAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects slugs matching RESERVED_SUBDOMAINS", async () => {
    const result = await checkTeamSlugAvailability("www");
    expect(result.available).toBe(false);
    expect(result.message).toBe("This slug is reserved");
  });

  it("allows normal team slugs", async () => {
    const result = await checkTeamSlugAvailability("my-awesome-team");
    expect(result.available).toBe(true);
  });

  it("rejects empty slugs", async () => {
    const result = await checkTeamSlugAvailability("");
    expect(result.available).toBe(false);
    expect(result.message).toBe("Slug is required");
  });
});
