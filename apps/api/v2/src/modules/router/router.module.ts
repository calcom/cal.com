import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RouterController } from "@/modules/router/controllers/router.controller";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [TeamsEventTypesRepository],
  exports: [],
  controllers: [RouterController],
})
export class RouterModule {}
