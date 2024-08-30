import { TestingModuleBuilder } from "@nestjs/testing";
import { ApiAuthStrategy } from "app/modules/auth/strategies/api-auth/api-auth.strategy";
import { UsersRepository } from "app/modules/users/users.repository";
import { ApiAuthMockStrategy } from "test/mocks/api-auth-mock.strategy";

export const withApiAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(ApiAuthStrategy).useFactory({
    factory: (usersRepository: UsersRepository) => new ApiAuthMockStrategy(email, usersRepository),
    inject: [UsersRepository],
  });
