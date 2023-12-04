import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findById(userId: number) {
    return this.dbRead.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
}
