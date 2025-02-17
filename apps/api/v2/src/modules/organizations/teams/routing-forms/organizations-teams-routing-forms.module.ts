import { OrganizationsTeamsRoutingFormsController } from "@/modules/organizations/teams/routing-forms/controllers/organizations-teams-routing-forms.controller";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

import { OrganizationsTeamsRoutingFormsRepository } from "./organizations-teams-routing-forms.repository";
import { OrganizationsTeamsRoutingFormsService } from "./services/organizations-teams-routing-forms-responses.service";

@Module({
  imports: [PrismaModule],
  providers: [OrganizationsTeamsRoutingFormsService, OrganizationsTeamsRoutingFormsRepository],
  controllers: [OrganizationsTeamsRoutingFormsController],
})
export class OrganizationsTeamsRoutingFormsModule {}
