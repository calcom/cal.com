import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { EmailModule } from "@/modules/email/email.module";
import { EmailService } from "@/modules/email/email.service";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsSchedulesController } from "@/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsTeamsController } from "@/modules/organizations/controllers/teams/organizations-teams.controller";
import { OrganizationsUsersController } from "@/modules/organizations/controllers/users/organizations-users.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationSchedulesRepository } from "@/modules/organizations/repositories/organizations-schedules.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import { OrganizationsTeamsService } from "@/modules/organizations/services/organizations-teams.service";
import { OrganizationsUsersService } from "@/modules/organizations/services/organizations-users-service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule, SchedulesModule_2024_06_11, UsersModule, RedisModule, EmailModule],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsService,
    OrganizationsTeamsService,
    MembershipsRepository,
    OrganizationsSchedulesService,
    OrganizationSchedulesRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
    EmailService,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
  ],
  controllers: [OrganizationsTeamsController, OrganizationsSchedulesController, OrganizationsUsersController],
})
export class OrganizationsModule {}
