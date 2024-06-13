import { ApiAuthStrategy } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { UsersRepository } from "@/modules/users/users.repository";
import { TestingModuleBuilder } from "@nestjs/testing";
import { AccessTokenMockStrategy } from "test/mocks/access-token-mock.strategy";

export const withAccessTokenAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(ApiAuthStrategy).useFactory({
    factory: (usersRepository: UsersRepository) => new AccessTokenMockStrategy(email, usersRepository),
    inject: [UsersRepository],
  });
