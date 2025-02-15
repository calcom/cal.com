import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OrganizationsDwdRepository } from "@/modules/organizations/dwd/organizations-dwd.repository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/repositories/organizations-membership.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SelectedCalendarsController } from "@/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { SelectedCalendarsService } from "@/modules/selected-calendars/services/selected-calendars.service";
import { UsersRepository } from "@/modules/users/users.repository";
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
    OrganizationsDwdRepository,
    OrganizationsMembershipRepository,
    SelectedCalendarsService,
  ],
  controllers: [SelectedCalendarsController],
  exports: [SelectedCalendarsRepository],
})
export class SelectedCalendarsModule {}
