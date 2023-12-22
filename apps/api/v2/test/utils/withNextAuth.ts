import { NextAuthStrategy } from "@/modules/auth/strategies";
import { UsersRepository } from "@/modules/users/users.repository";
import { TestingModuleBuilder } from "@nestjs/testing";
import { NextAuthMockStrategy } from "test/mocks/next-auth-mock.strategy";

export const withNextAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(NextAuthStrategy).useFactory({
    factory: (userRepository: UsersRepository) => new NextAuthMockStrategy(email, userRepository),
    inject: [UsersRepository],
  });
