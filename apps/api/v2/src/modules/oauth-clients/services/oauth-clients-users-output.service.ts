import type { User } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";

@Injectable()
export class OAuthClientUsersOutputService {
  getResponseUser(user: User) {
    return plainToInstance(ManagedUserOutput, user, { strategy: "excludeAll" });
  }
}
