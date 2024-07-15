import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsEventTypesController } from "@/modules/organizations/controllers/event-types/organizations-event-types.controller";
import { OrganizationsTeamsController } from "@/modules/organizations/controllers/organizations-teams.controller";
import { OrganizationsSchedulesController } from "@/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsEventTypesRepository } from "@/modules/organizations/repositories/organizations-event-types.repository";
import { OrganizationSchedulesRepository } from "@/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/output.service";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule, SchedulesModule_2024_06_11, UsersModule, EventTypesModule_2024_06_14],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsService,
    OrganizationsTeamsService,
    MembershipsRepository,
    OrganizationsSchedulesService,
    OrganizationSchedulesRepository,
    OrganizationsEventTypesService,
    InputOrganizationsEventTypesService,
    OutputOrganizationsEventTypesService,
    OrganizationsEventTypesRepository,
  ],
  exports: [OrganizationsService, OrganizationsRepository, OrganizationsTeamsRepository],
  controllers: [
    OrganizationsTeamsController,
    OrganizationsSchedulesController,
    OrganizationsEventTypesController,
  ],
})
export class OrganizationsModule {}
