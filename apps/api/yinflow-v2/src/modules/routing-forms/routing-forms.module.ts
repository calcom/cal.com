import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { RoutingFormsRepository } from "../routing-forms/routing-forms.repository";

@Module({
  imports: [PrismaModule],
  providers: [RoutingFormsRepository],
  exports: [RoutingFormsRepository],
})
export class RoutingFormsModule {}
