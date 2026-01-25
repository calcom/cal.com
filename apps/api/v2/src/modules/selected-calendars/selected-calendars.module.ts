import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { CalendarsRepository } from "@/ee/calendars/calendars.repository";
import { CALENDARS_QUEUE } from "@/ee/calendars/processors/calendars.processor";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { CalendarsTaskerModule } from "@/lib/modules/calendars-tasker.module";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { OrganizationsMembershipRepository } from "@/modules/organizations/memberships/organizations-membership.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import { OrganizationsMembershipOutputService } from "@/modules/organizations/memberships/services/organizations-membership-output.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { SelectedCalendarsController } from "@/modules/selected-calendars/controllers/selected-calendars.controller";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { SelectedCalendarsService } from "@/modules/selected-calendars/services/selected-calendars.service";
import { UsersRepository } from "@/modules/users/users.repository";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({
      name: CALENDARS_QUEUE,
      limiter: {
        max: 1,
        duration: 1000,
      },
    }),
    CalendarsTaskerModule,
  ],
  providers: [
    SelectedCalendarsRepository,
    CalendarsRepository,
    CalendarsService,
    CalendarsCacheService,
    UsersRepository,
    CredentialsRepository,
    AppsRepository,
    OrganizationsDelegationCredentialService,
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
