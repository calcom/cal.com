import { RoutingFormsResponsesModule } from "@/modules/routing-forms-responses/routing-forms-responses.module";
import { Module } from "@nestjs/common";

import { OrganizationsRoutingFormsResponsesController } from "./controllers/organizations-routing-forms-responses.controller";

@Module({
  imports: [RoutingFormsResponsesModule],
  controllers: [OrganizationsRoutingFormsResponsesController],
})
export class OrganizationsRoutingFormsModule {}
