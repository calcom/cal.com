import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizations-membership-output.service";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsController } from "@/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { SelectedCalendarsService } from "@/modules/selected-calendars/services/selected-calendars.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [
    SelectedCalendarsRepository,
    CalendarsRepository,
    CalendarsService,
    CalendarsCacheService,
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
