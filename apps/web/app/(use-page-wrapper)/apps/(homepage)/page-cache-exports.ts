import { unstable_cache } from "next/cache";

import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { UserRepository } from "@calcom/lib/server/repository/user";

export const getCachedAppRegistry = unstable_cache(
  async () => {
    return await getAppRegistry();
  },
  ["appRegistry.get"],
  { revalidate: 3600 } // Cache for 1 hour
);

export const getCachedAppRegistryWithCredentials = unstable_cache(
  async (userId: number, teamIds: number[]) => {
    return await getAppRegistryWithCredentials(userId, teamIds);
  },
  ["appRegistry.getWithCredentials"],
  { revalidate: 3600 } // Cache for 1 hour
);

export const getCachedUserAdminTeams = unstable_cache(
  async (userId: number) => {
    return await UserRepository.getUserAdminTeams(userId);
  },
  ["user.getAdminTeams"],
  { revalidate: 3600 } // Cache for 1 hour
);
