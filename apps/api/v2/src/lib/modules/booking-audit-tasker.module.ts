import { Logger } from "@/lib/logger.bridge";
import { BookingAuditSyncTaskerService } from "@/lib/services/tasker/booking-audit-sync-tasker.service";
import { BookingAuditTaskConsumerService } from "@/lib/services/tasker/booking-audit-task-consumer.service";
import { BookingAuditTaskerService } from "@/lib/services/tasker/booking-audit-tasker.service";
import { BookingAuditTriggerTaskerService } from "@/lib/services/tasker/booking-audit-trigger-tasker.service";
import { Module, Scope } from "@nestjs/common";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: Logger,
      useFactory: () => {
        return new Logger();
      },
      scope: Scope.TRANSIENT,
    },
    BookingAuditTaskConsumerService,
    BookingAuditSyncTaskerService,
    BookingAuditTriggerTaskerService,
    BookingAuditTaskerService,
  ],
  exports: [BookingAuditTaskerService],
})
export class BookingAuditTaskerModule {}
