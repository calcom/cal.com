import { AccessTokenStrategy } from "@/modules/auth/strategies/access-token/access-token.strategy";
import { UsersRepository } from "@/modules/users/users.repository";
import { TestingModuleBuilder } from "@nestjs/testing";
import { AccessTokenMockStrategy } from "test/mocks/access-token-mock.strategy";

export const withAccessTokenAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(AccessTokenStrategy).useFactory({
    factory: (usersRepository: UsersRepository) => new AccessTokenMockStrategy(email, usersRepository),
    inject: [UsersRepository],
  });
