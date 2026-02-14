import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import type { User } from "@calcom/prisma/client";

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
    const users = await Promise.all(
      usernames.map((username) => this.usersRepository.findByUsername(username, orgSlug, orgId))
    );

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
