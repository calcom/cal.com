import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

export type ProfileMinimal = {
  id: number;
  username?: string | null;
  organizationId: number | null;
  organization: {
    id: number;
    slug?: string | null;
    isPlatform: boolean;
  } | null;
};

export type UserWithProfileMinimal = {
  organizationId?: number | null;
  movedToProfile?: ProfileMinimal | null;
  profiles?: ProfileMinimal[];
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getByUsernames(usernames: string[], orgSlug?: string, orgId?: number) {
    if (orgSlug || orgId) {
      return await this.usersRepository.findManyByUsernames(usernames, orgSlug, orgId);
    }

    const users = await this.usersRepository.findManyByUsernamesExcludingOrgUsers(usernames);

    if (users.length === usernames.length) {
      return users;
    }

    const foundUsernames = new Set(users.map((u) => u.username));
    const missingUsernames = usernames.filter((username) => !foundUsernames.has(username));

    if (missingUsernames.length > 0) {
      const usersWithMatchingProfile =
        await this.usersRepository.findManyByUsernamesWithMatchingProfile(missingUsernames);

      const usernameToUsers = new Map<string, typeof usersWithMatchingProfile>();
      for (const user of usersWithMatchingProfile) {
        if (user.username) {
          const existing = usernameToUsers.get(user.username) || [];
          existing.push(user);
          usernameToUsers.set(user.username, existing);
        }
      }

      for (const [_username, matchedUsers] of usernameToUsers) {
        if (matchedUsers.length === 1) {
          users.push(matchedUsers[0]);
        }
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
