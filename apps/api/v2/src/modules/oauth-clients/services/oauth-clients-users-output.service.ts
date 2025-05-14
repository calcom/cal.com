import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { Injectable } from "@nestjs/common";
import { User } from "@calcom/prisma/client";
import { plainToInstance } from "class-transformer";

@Injectable()
export class OAuthClientUsersOutputService {
  getResponseUser(user: User) {
    return plainToInstance(ManagedUserOutput, user, { strategy: "excludeAll" });
  }
}
