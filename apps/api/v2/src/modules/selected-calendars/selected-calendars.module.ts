import { CalendarsRepository } from "@/ee/calendars/calendarsRepository";
import { CalendarsService } from "@/ee/calendars/services/calendarsService";
import { AppsRepository } from "@/modules/apps/appsRepository";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizationsDelegationCredentialRepository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizationsMembershipRepository";
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizationsMembershipOutputService";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizationsMembershipService";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsController } from "@/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selectedCalendarsRepository";
import { SelectedCalendarsService } from "@/modules/selected-calendars/services/selectedCalendarsService";
import { UsersRepository } from "@/modules/users/usersRepository";
import { Module } from "@nestjs/common";

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
    OrganizationsMembershipOutputService,
    OrganizationsDelegationCredentialRepository,
    OrganizationsMembershipRepository,
    SelectedCalendarsService,
  ],
  controllers: [SelectedCalendarsController],
  exports: [SelectedCalendarsRepository],
})
export class SelectedCalendarsModule {}
