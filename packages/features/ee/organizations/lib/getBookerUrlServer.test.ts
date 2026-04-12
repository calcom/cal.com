import { constantsScenarios } from "@calcom/lib/__mocks__/constants";
import { getBrand } from "@calcom/features/ee/organizations/lib/getBrand";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/features/ee/organizations/lib/getBrand", () => ({
  getBrand: vi.fn(),
}));

import { getBookerBaseUrl, getTeamBookerUrl } from "./getBookerUrlServer";

describe("getBookerUrlServer", () => {
  beforeEach(() => {
    constantsScenarios.set({
      WEBAPP_URL: "https://app.cal.eu",
      WEBSITE_URL: "https://cal.com",
    });
  });

  it("uses the runtime webapp origin when no organization brand exists", async () => {
    vi.mocked(getBrand).mockResolvedValueOnce(null);

    await expect(getBookerBaseUrl(null)).resolves.toBe("https://app.cal.eu");
  });

  it("uses the runtime webapp origin for team URLs when no organization brand exists", async () => {
    vi.mocked(getBrand).mockResolvedValueOnce(null);

    await expect(getTeamBookerUrl({ organizationId: null })).resolves.toBe("https://app.cal.eu");
  });

  it("prefers the organization brand full domain when available", async () => {
    vi.mocked(getBrand).mockResolvedValueOnce({ fullDomain: "https://acme.cal.eu" } as never);

    await expect(getBookerBaseUrl(123)).resolves.toBe("https://acme.cal.eu");
  });
});
