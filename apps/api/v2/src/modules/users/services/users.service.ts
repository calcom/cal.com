import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import type { User } from "@calcom/prisma/client";

/**
 * Minimal profile type with only the fields required for profile resolution.
 * This allows both full UserWithProfile and partial user data (from select queries) to work.
 * Note: id is optional because movedToProfile from repository doesn't include it.
 */
export type ProfileMinimal = {
  id?: number;
  username?: string | null;
  organizationId: number | null;
  organization: {
    id: number;
    slug?: string | null;
    name?: string;
    isPlatform: boolean;
  } | null;
};

/**
 * Minimal user type that can accept either full UserWithProfile or partial user data.
 * This enables code reuse without requiring full user model fetches.
 */
export type UserWithProfileMinimal = {
  organizationId?: number | null;
  movedToProfile?: ProfileMinimal | null;
  profiles?: ProfileMinimal[];
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getByUsernames(usernames: string[], orgSlug?: string, orgId?: number) {
    const users = await Promise.all(
      usernames.map((username) => this.usersRepository.findByUsername(username, orgSlug, orgId))
    );
    const usersFiltered: User[] = [];

    for (const user of users) {
      if (user) {
        usersFiltered.push(user);
      }
    }

    return users;
  }

  getUserMainProfile(user: UserWithProfileMinimal): ProfileMinimal | undefined {
    return (
      user?.movedToProfile ||
      user.profiles?.find((p) => p.organizationId === user.organizationId) ||
      user.profiles?.[0]
    );
  }

  getUserMainOrgId(user: UserWithProfileMinimal): number | null {
    return this.getUserMainProfile(user)?.organizationId ?? user.organizationId ?? null;
  }

  getUserProfileByOrgId(user: UserWithProfile, organizationId: number) {
    return user.profiles?.find((p) => p.organizationId === organizationId);
  }
}
