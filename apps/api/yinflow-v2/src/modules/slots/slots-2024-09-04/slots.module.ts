import { Module } from "@nestjs/common";

import { EventTypesModule_2024_06_14 } from "../../../ee/event-types/event-types_2024_06_14/event-types.module";
import { MembershipsModule } from "../../memberships/memberships.module";
import { OrganizationsRepository } from "../../organizations/index/organizations.repository";
import { OrganizationsUsersRepository } from "../../organizations/users/index/organizations-users.repository";
import { PrismaModule } from "../../prisma/prisma.module";
import { SlotsController_2024_09_04 } from "../../slots/slots-2024-09-04/controllers/slots.controller";
import { SlotsInputService_2024_09_04 } from "../../slots/slots-2024-09-04/services/slots-input.service";
import { SlotsOutputService_2024_09_04 } from "../../slots/slots-2024-09-04/services/slots-output.service";
import { SlotsService_2024_09_04 } from "../../slots/slots-2024-09-04/services/slots.service";
import { SlotsRepository_2024_09_04 } from "../../slots/slots-2024-09-04/slots.repository";
import { StripeModule } from "../../stripe/stripe.module";
import { TeamsModule } from "../../teams/teams/teams.module";
import { UsersRepository } from "../../users/users.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, StripeModule, TeamsModule, MembershipsModule],
  providers: [
    SlotsRepository_2024_09_04,
    SlotsService_2024_09_04,
    UsersRepository,
    SlotsInputService_2024_09_04,
    SlotsOutputService_2024_09_04,
    OrganizationsUsersRepository,
    OrganizationsRepository,
  ],
  controllers: [SlotsController_2024_09_04],
  exports: [SlotsService_2024_09_04],
})
export class SlotsModule_2024_09_04 {}
