import type { User } from "@calcom/prisma/client";

export interface IUsersRepository {
  updateLastActiveAt(userId: number): Promise<User>;
}
