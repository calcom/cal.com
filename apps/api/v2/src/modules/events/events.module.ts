import { EventsController } from "@/modules/events/controllers/events.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
})
export class EventsModule {}
