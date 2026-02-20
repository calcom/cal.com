import { Logger } from "@/lib/logger.bridge";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

import { CalendarsTaskService as BaseCalendarsTaskService } from "@calcom/platform-libraries/calendars";

@Injectable()
export class CalendarsTaskService extends BaseCalendarsTaskService {
  constructor(prismaReadService: PrismaReadService, logger: Logger) {
    super({
      logger,
      prisma: prismaReadService.prisma,
    });
  }
}
