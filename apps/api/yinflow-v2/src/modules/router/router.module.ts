import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { RouterController } from "../router/controllers/router.controller";
import { TeamsEventTypesRepository } from "../teams/event-types/teams-event-types.repository";

@Module({
  imports: [PrismaModule],
  providers: [TeamsEventTypesRepository],
  exports: [],
  controllers: [RouterController],
})
export class RouterModule {}
