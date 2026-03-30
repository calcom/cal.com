import { describe, it, expect, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  subdomainSuffix: vi.fn().mockReturnValue(".cal.com"),
  getOrgFullOrigin: vi.fn((slug: string) => `https://${slug}.cal.com`),
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  teamMetadataSchema: {
    parse: vi.fn((v: any) => v || {}),
  },
}));

import { getBrand } from "./getBrand";
import { prisma } from "@calcom/prisma";

describe("getBrand", () => {
  it("returns null when orgId is null", async () => {
    const result = await getBrand(null);
    expect(result).toBeNull();
  });

  it("returns null when org not found", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);
    const result = await getBrand(1);
    expect(result).toBeNull();
  });

  it("returns null when org isPlatform", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      logoUrl: null,
      name: "Test",
      slug: "test",
      metadata: {},
      isPlatform: true,
    } as any);
    const result = await getBrand(1);
    expect(result).toBeNull();
  });

  it("returns brand data for non-platform org", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({
      logoUrl: "logo.png",
      name: "Test Org",
      slug: "test-org",
      metadata: {},
      isPlatform: false,
    } as any);
    const result = await getBrand(1);
    expect(result).not.toBeNull();
    expect(result?.fullDomain).toBe("https://test-org.cal.com");
  });
});
