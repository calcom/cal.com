import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BookingSeatRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getByReferenceUid(referenceUid: string) {
    return this.dbRead.prisma.bookingSeat.findUnique({
      where: {
        referenceUid,
      },
      include: {
        booking: { select: { uid: true } },
      },
    });
  }
}
