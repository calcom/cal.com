import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RoutingFormsRepository } from "@/modules/routing-forms/routing-forms.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [RoutingFormsRepository],
  exports: [RoutingFormsRepository],
})
export class RoutingFormsModule {}
