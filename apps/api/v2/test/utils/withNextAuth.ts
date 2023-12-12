import { NextAuthStrategy } from "@/modules/auth/strategy";
import { UserRepository } from "@/modules/repositories/user/user-repository.service";
import { TestingModuleBuilder } from "@nestjs/testing";

import { NextAuthMockStrategy } from "../mocks/next-auth-mock.strategy";

export const withNextAuth = (email: string, module: TestingModuleBuilder) =>
  module.overrideProvider(NextAuthStrategy).useFactory({
    factory: (userRepository: UserRepository) => new NextAuthMockStrategy(email, userRepository),
    inject: [UserRepository],
  });
