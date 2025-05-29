import { unstable_cache } from "next/cache";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { UserRepository } from "@calcom/lib/server/repository/user";

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn, keys, options) => {
    const cache = new Map();

    return async (...args: any[]) => {
      const cacheKey = JSON.stringify(args);

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const result = await fn(...args);
      cache.set(cacheKey, result);
      return result;
    };
  }),
}));

vi.mock("@calcom/app-store/_appRegistry", () => ({
  getAppRegistry: vi.fn().mockResolvedValue([
    { name: "App1", categories: ["calendar"] },
    { name: "App2", categories: ["video"] },
  ]),
  getAppRegistryWithCredentials: vi.fn().mockResolvedValue([
    { name: "App1", categories: ["calendar"] },
    { name: "App2", categories: ["video"] },
  ]),
}));

vi.mock("@calcom/lib/server/repository/user", () => ({
  UserRepository: {
    getUserAdminTeams: vi.fn().mockResolvedValue({
      teams: [{ team: { id: 1, name: "Team1" } }],
    }),
  },
}));

vi.mock("react", () => ({
  createElement: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockReturnValue({}),
  headers: vi.fn().mockReturnValue({}),
}));

vi.mock("app/_utils", () => ({
  _generateMetadata: vi.fn().mockResolvedValue({}),
}));

vi.mock("@lib/buildLegacyCtx", () => ({
  buildLegacyRequest: vi.fn().mockReturnValue({}),
}));

vi.mock("~/apps/apps-view", () => ({
  default: vi.fn().mockReturnValue(null),
}));

describe("Apps Homepage Caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Cached functions", () => {
    it("should call getAppRegistry only once when cached function is called multiple times", async () => {
      const getCachedAppRegistry = unstable_cache(
        async () => {
          return await getAppRegistry();
        },
        ["appRegistry.get"],
        { revalidate: 3600 }
      );

      await getCachedAppRegistry();
      await getCachedAppRegistry();
      await getCachedAppRegistry();

      expect(getAppRegistry).toHaveBeenCalledTimes(1);
    });

    it("should call getAppRegistryWithCredentials only once when cached function is called multiple times with the same parameters", async () => {
      const getCachedAppRegistryWithCredentials = unstable_cache(
        async (userId: number, teamIds: number[]) => {
          return await getAppRegistryWithCredentials(userId, teamIds);
        },
        ["appRegistry.getWithCredentials"],
        { revalidate: 3600 }
      );

      await getCachedAppRegistryWithCredentials(1, [10, 20]);
      await getCachedAppRegistryWithCredentials(1, [10, 20]);
      await getCachedAppRegistryWithCredentials(1, [10, 20]);

      expect(getAppRegistryWithCredentials).toHaveBeenCalledTimes(1);
      expect(getAppRegistryWithCredentials).toHaveBeenCalledWith(1, [10, 20]);
    });

    it("should call getAppRegistryWithCredentials again when cached function is called with different parameters", async () => {
      const getCachedAppRegistryWithCredentials = unstable_cache(
        async (userId: number, teamIds: number[]) => {
          return await getAppRegistryWithCredentials(userId, teamIds);
        },
        ["appRegistry.getWithCredentials"],
        { revalidate: 3600 }
      );

      await getCachedAppRegistryWithCredentials(1, [10, 20]);

      await getCachedAppRegistryWithCredentials(2, [30, 40]);

      expect(getAppRegistryWithCredentials).toHaveBeenCalledTimes(2);
      expect(getAppRegistryWithCredentials).toHaveBeenNthCalledWith(1, 1, [10, 20]);
      expect(getAppRegistryWithCredentials).toHaveBeenNthCalledWith(2, 2, [30, 40]);
    });

    it("should call getUserAdminTeams only once when cached function is called multiple times with the same user ID", async () => {
      const getCachedUserAdminTeams = unstable_cache(
        async (userId: number) => {
          return await UserRepository.getUserAdminTeams(userId);
        },
        ["user.getAdminTeams"],
        { revalidate: 3600 }
      );

      await getCachedUserAdminTeams(1);
      await getCachedUserAdminTeams(1);
      await getCachedUserAdminTeams(1);

      expect(UserRepository.getUserAdminTeams).toHaveBeenCalledTimes(1);
      expect(UserRepository.getUserAdminTeams).toHaveBeenCalledWith(1);
    });

    it("should call getUserAdminTeams again when cached function is called with a different user ID", async () => {
      const getCachedUserAdminTeams = unstable_cache(
        async (userId: number) => {
          return await UserRepository.getUserAdminTeams(userId);
        },
        ["user.getAdminTeams"],
        { revalidate: 3600 }
      );

      await getCachedUserAdminTeams(1);

      await getCachedUserAdminTeams(2);

      expect(UserRepository.getUserAdminTeams).toHaveBeenCalledTimes(2);
      expect(UserRepository.getUserAdminTeams).toHaveBeenNthCalledWith(1, 1);
      expect(UserRepository.getUserAdminTeams).toHaveBeenNthCalledWith(2, 2);
    });

    it("should use unstable_cache with correct cache keys and revalidation period", () => {
      unstable_cache(
        async () => {
          return await getAppRegistry();
        },
        ["appRegistry.get"],
        { revalidate: 3600 }
      );

      unstable_cache(
        async (userId: number, teamIds: number[]) => {
          return await getAppRegistryWithCredentials(userId, teamIds);
        },
        ["appRegistry.getWithCredentials"],
        { revalidate: 3600 }
      );

      unstable_cache(
        async (userId: number) => {
          return await UserRepository.getUserAdminTeams(userId);
        },
        ["user.getAdminTeams"],
        { revalidate: 3600 }
      );

      expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ["appRegistry.get"], {
        revalidate: 3600,
      });

      expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ["appRegistry.getWithCredentials"], {
        revalidate: 3600,
      });

      expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ["user.getAdminTeams"], {
        revalidate: 3600,
      });
    });
  });
});
