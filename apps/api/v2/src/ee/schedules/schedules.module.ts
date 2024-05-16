import { SchedulesController } from "@/ee/schedules/controllers/schedules.controller";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { InputSchedulesService } from "@/ee/schedules/services/input-schedules.service";
import { OutputSchedulesService } from "@/ee/schedules/services/output-schedules.service";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, UsersModule, TokensModule],
  providers: [SchedulesRepository, SchedulesService, InputSchedulesService, OutputSchedulesService],
  controllers: [SchedulesController],
  exports: [SchedulesService, SchedulesRepository],
})
export class SchedulesModule {}
