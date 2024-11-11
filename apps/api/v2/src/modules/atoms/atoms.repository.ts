import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { paymentDataSelect } from "@calcom/platform-libraries";

@Injectable()
export class AtomsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getRawPayment(uid: string) {
    return await this.dbRead.prisma.payment.findFirst({
      where: { uid },
      select: paymentDataSelect,
    });
  }
}
