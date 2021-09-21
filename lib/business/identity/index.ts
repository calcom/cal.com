import { IdentityService } from "./IdentityService";
import { BcryptPassworAuthenticator } from "./internal/BcryptPasswordAuthenticator";
import { PrismaUserRepository } from "./internal/repositories/PrismaUserRepository";
import { UserPolicyChecker } from "./internal/UserPolicyChecker";

export const service = new IdentityService(
  new BcryptPassworAuthenticator(),
  new UserPolicyChecker(),
  new PrismaUserRepository()
);
