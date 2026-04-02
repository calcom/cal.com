import { CalendarsTaskService as BaseCalendarsTaskService } from "@calcom/platform-libraries/calendars";
import { Injectable } from "@nestjs/common";
import { Logger } from "@/lib/logger.bridge";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";

@Injectable()
export class CalendarsTaskService extends BaseCalendarsTaskService {
  constructor(prismaReadService: PrismaReadService, logger: Logger) {
    super({
      logger,
      prisma: prismaReadService.prisma,
    });
  }
}
