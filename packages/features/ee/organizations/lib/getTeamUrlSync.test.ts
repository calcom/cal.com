import * as getBookerBaseUrlSyncExport from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { describe, expect, it, vi } from "vitest";
import { getTeamUrlSync } from "./getTeamUrlSync";

vi.mock("@calcom/features/ee/organizations/lib/getBookerBaseUrlSync", async () => {
  return {
    getBookerBaseUrlSync: vi.fn(),
  };
});

describe("getBookerUrl:client", () => {
  describe("getTeamUrlSync", () => {
    it("if orgSlug is null, it should return a URL with /team in it", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      getBookerBaseUrlSyncExport.getBookerBaseUrlSync.mockReturnValueOnce("https://abc.com");
      const url = getTeamUrlSync({ orgSlug: null, teamSlug: "myTeam" });
      expect(url).toBe("https://abc.com/team/myTeam");
    });

    it("if orgSlug is set, it should return a URL without /team in it", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      getBookerBaseUrlSyncExport.getBookerBaseUrlSync.mockReturnValueOnce("https://acme.com");
      const url = getTeamUrlSync({ orgSlug: "acme", teamSlug: "myTeam" });
      expect(url).toBe("https://acme.com/myTeam");
    });
  });
});
