import { Module } from "@nestjs/common";

import { CalendarsRepository } from "../../ee/calendars/calendars.repository";
import { CalendarsService } from "../../ee/calendars/services/calendars.service";
import { AppsRepository } from "../apps/apps.repository";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { OrganizationsDelegationCredentialRepository } from "../organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsMembershipRepository } from "../organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipService } from "../organizations/memberships/services/organizations-membership.service";
import { PrismaModule } from "../prisma/prisma.module";
import { SelectedCalendarsController } from "../selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "../selected-calendars/selected-calendars.repository";
import { SelectedCalendarsService } from "../selected-calendars/services/selected-calendars.service";
import { UsersRepository } from "../users/users.repository";

@Module({
  imports: [PrismaModule],
  providers: [
    SelectedCalendarsRepository,
    CalendarsRepository,
    CalendarsService,
    UsersRepository,
    CredentialsRepository,
    AppsRepository,
    OrganizationsMembershipService,
    OrganizationsDelegationCredentialRepository,
    OrganizationsMembershipRepository,
    SelectedCalendarsService,
  ],
  controllers: [SelectedCalendarsController],
  exports: [SelectedCalendarsRepository],
})
export class SelectedCalendarsModule {}
