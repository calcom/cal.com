import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RouterController } from "@/modules/router/controllers/router.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [],
  exports: [],
  controllers: [RouterController],
})
export class RouterModule {}
