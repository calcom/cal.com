import { EventTypesController } from "@/ee/event-types/controllers/event-types.controller";
import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [EventTypesService],
  controllers: [EventTypesController],
})
export class EventTypesModule {}
