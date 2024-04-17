import { BearerStrategy } from "@/modules/auth/strategies/bearer/bearer.strategy";
import { UsersRepository } from "@/modules/users/users.repository";
import { TestingModuleBuilder } from "@nestjs/testing";
import { BearerMockStrategy } from "test/mocks/bearer.strategy";

export const withBearerAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(BearerStrategy).useFactory({
    factory: (usersRepository: UsersRepository) => new BearerMockStrategy(email, usersRepository),
    inject: [UsersRepository],
  });
