import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RoutingFormsResponsesRepository } from "@/modules/routing-forms-responses/routing-forms-responses.repository";
import { RoutingFormsResponsesOutputService } from "@/modules/routing-forms-responses/services/routing-forms-responses-output.service";
import { RoutingFormsResponsesService } from "@/modules/routing-forms-responses/services/routing-forms-responses.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    RoutingFormsResponsesService,
    RoutingFormsResponsesRepository,
    RoutingFormsResponsesOutputService,
  ],
  exports: [
    RoutingFormsResponsesService,
    RoutingFormsResponsesRepository,
    RoutingFormsResponsesOutputService,
  ],
})
export class RoutingFormsResponsesModule {}
