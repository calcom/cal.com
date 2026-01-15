import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

import type { User } from "@calcom/prisma/client";

@Injectable()
export class OAuthClientUsersOutputService {
  getResponseUser(user: User) {
    return plainToInstance(ManagedUserOutput, user, { strategy: "excludeAll" });
  }
}
