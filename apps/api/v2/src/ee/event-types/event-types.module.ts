import { EventTypesController } from "@/ee/event-types/controllers/event-types.controller";
import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [EventTypesRepository],
  controllers: [EventTypesController],
})
export class EventTypesModule {}
