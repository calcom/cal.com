import { Logger } from "@/lib/logger.bridge";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import {
  BookingAuditTaskConsumer as BaseBookingAuditTaskConsumer,
  PrismaBookingAuditRepository,
  PrismaAuditActorRepository,
  BookingAuditActionServiceRegistry,
} from "@calcom/platform-libraries/bookings";
import { PrismaTeamFeatureRepository } from "@calcom/platform-libraries/repositories";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class BookingAuditTaskConsumerService extends BaseBookingAuditTaskConsumer {
  constructor(private readonly dbWrite: PrismaWriteService) {
    const prismaClient = dbWrite.prisma as unknown as PrismaClient;
    super({
      bookingAuditRepository: new PrismaBookingAuditRepository({ prismaClient }),
      auditActorRepository: new PrismaAuditActorRepository({ prismaClient }),
      teamFeatureRepository: new PrismaTeamFeatureRepository(prismaClient),
      actionServiceRegistry: new BookingAuditActionServiceRegistry(),
    });
  }
}
