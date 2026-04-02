import { TestingModuleBuilder } from "@nestjs/testing";
import { NextAuthMockStrategy } from "test/mocks/next-auth-mock.strategy";
import { NextAuthStrategy } from "@/modules/auth/strategies/next-auth/next-auth.strategy";
import { UsersRepository } from "@/modules/users/users.repository";

export const withNextAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(NextAuthStrategy).useFactory({
    factory: (userRepository: UsersRepository) => new NextAuthMockStrategy(email, userRepository),
    inject: [UsersRepository],
  });
