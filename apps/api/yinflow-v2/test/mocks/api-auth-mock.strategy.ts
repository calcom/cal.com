import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";

import { BaseStrategy } from "../../src/lib/passport/strategies/types";
import { ApiAuthGuardRequest } from "../../src/modules/auth/strategies/api-auth/api-auth.strategy";
import { UsersService } from "../../src/modules/users/services/users.service";
import { UsersRepository } from "../../src/modules/users/users.repository";

@Injectable()
export class ApiAuthMockStrategy extends PassportStrategy(BaseStrategy, "api-auth") {
  constructor(
    private readonly email: string,
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService
  ) {
    super();
  }

  async authenticate(request: ApiAuthGuardRequest) {
    try {
      const user = await this.usersRepository.findByEmailWithProfile(this.email);
      if (!user) {
        throw new Error("User with the provided ID not found");
      }

      const organizationId = this.usersService.getUserMainOrgId(user) as number;
      request.organizationId = organizationId;

      return this.success(user);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) return this.error(error);
    }
  }
}
