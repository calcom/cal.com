import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RoutingFormsResponsesRepository } from "@/modules/routing-forms-responses/routing-forms-responses.repository";
import { RoutingFormsResponsesService } from "@/modules/routing-forms-responses/routing-forms-responses.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [RoutingFormsResponsesService, RoutingFormsResponsesRepository],
  exports: [RoutingFormsResponsesService, RoutingFormsResponsesRepository],
})
export class RoutingFormsResponsesModule {}
