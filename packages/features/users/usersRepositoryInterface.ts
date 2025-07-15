import type { User } from "@prisma/client";

export interface IUsersRepository {
  updateLastActiveAt(userId: number): Promise<User>;
}
