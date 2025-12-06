import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { User } from "@calcom/prisma/client";

import { UserDeletionService } from "../services/userDeletionService";
import { UsersRepository } from "../users.repository";

export async function deleteUser(user: Pick<User, "id" | "email" | "metadata">) {
  const userDeletionService = new UserDeletionService({
    usersRepository: new UsersRepository(),
    credentialRepository: CredentialRepository,
  });

  await userDeletionService.deleteUser(user);
}
