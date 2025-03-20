import { TestingModuleBuilder } from "@nestjs/testing";
import { ApiAuthMockStrategy } from "test/mocks/api-auth-mock.strategy";

import { ApiAuthStrategy } from "../../src/modules/auth/strategies/api-auth/api-auth.strategy";
import { UsersService } from "../../src/modules/users/services/users.service";
import { UsersRepository } from "../../src/modules/users/users.repository";

export const withApiAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(ApiAuthStrategy).useFactory({
    factory: (usersRepository: UsersRepository, usersService: UsersService) =>
      new ApiAuthMockStrategy(email, usersRepository, usersService),
    inject: [UsersRepository, UsersService],
  });
