import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RouterController } from "@/modules/router/controllers/router.controller";
import { RoutingRepository } from "@/modules/router/router.repository";
import { RouterService } from "@/modules/router/services/router.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [RouterService, RoutingRepository],
  exports: [],
  controllers: [RouterController],
})
export class RouterModule {}
