import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { GuestBusyTimesService as BaseGuestBusyTimesService } from "@calcom/platform-libraries/slots";

@Injectable()
export class GuestBusyTimesService extends BaseGuestBusyTimesService {
  constructor(prismaWriteService: PrismaWriteService) {
    super({
      prisma: prismaWriteService.prisma,
    });
  }
}
