import { EventsRepository } from "@/modules/events/events.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [EventsRepository],
  //   controllers: [BookingsController],
})
export class EventsModule {}
