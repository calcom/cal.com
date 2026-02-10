import type { User } from "@calcom/prisma/client";

export interface IUsersRepository {
  updateLastActiveAt(userId: number): Promise<User>;

  /**
   * @param userId - The user ID to query
   * @returns User with team memberships, or null if user not found
   */
  findUserTeams(userId: number): Promise<{ teams: { teamId: number }[] } | null>;
}
