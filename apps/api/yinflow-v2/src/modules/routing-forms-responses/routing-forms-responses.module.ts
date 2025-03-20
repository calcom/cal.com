import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { RoutingFormsResponsesRepository } from "../routing-forms-responses/routing-forms-responses.repository";
import { RoutingFormsResponsesOutputService } from "../routing-forms-responses/services/routing-forms-responses-output.service";
import { RoutingFormsResponsesService } from "../routing-forms-responses/services/routing-forms-responses.service";

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
