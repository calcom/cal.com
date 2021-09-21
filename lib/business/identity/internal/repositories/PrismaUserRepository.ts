import prisma from "@lib/prisma";
import { UserRecord } from "./UserRecord";
import { UserRepository } from "./UserRepository";

export class PrismaUserRepository implements UserRepository {
  public async findById(id: number): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  public async updatePasswordById(id: number, password: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { password } });
  }
}
