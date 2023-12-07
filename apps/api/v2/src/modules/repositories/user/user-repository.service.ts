import type { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";

@Injectable()
export class UserRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findById(userId: number) {
    const user = await this.dbRead.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });
    return this.sanitize(user);
  }

  async findByEmail(email: string) {
    const user = await this.dbRead.prisma.user.findUniqueOrThrow({
      where: {
        email,
      },
    });
    return this.sanitize(user);
  }

  sanitize(user: User): Partial<User> {
    const keys: (keyof User)[] = ["password"];
    return Object.fromEntries(Object.entries(user).filter(([key]) => !keys.includes(key as keyof User)));
  }
}
