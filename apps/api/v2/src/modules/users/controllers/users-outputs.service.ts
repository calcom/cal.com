import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";

import { userMetadata } from "@calcom/platform-libraries-0.0.6";

@Injectable()
export class OutputUsersService {
  async getResponseUsers(users: User[]) {
    return this.transformUsers(users);
  }

  transformUsers(users: User[]) {
    return users.map((user) => {
      const metadata = user.metadata ? userMetadata.parse(user.metadata) : {};
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
        weekStart: user.weekStart,
        metadata: metadata || {},
      };
    });
  }
}
