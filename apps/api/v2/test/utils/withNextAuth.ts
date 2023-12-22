import { NextAuthStrategy } from "@/modules/auth/strategy";
import { UserRepository } from "@/modules/repositories/user/user.repository";
import { TestingModuleBuilder } from "@nestjs/testing";
import { NextAuthMockStrategy } from "test/mocks/next-auth-mock.strategy";

export const withNextAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(NextAuthStrategy).useFactory({
    factory: (userRepository: UserRepository) => new NextAuthMockStrategy(email, userRepository),
    inject: [UserRepository],
  });
