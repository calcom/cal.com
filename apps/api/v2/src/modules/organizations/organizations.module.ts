import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { OrganizationsTeamsController } from "@/modules/organizations/controllers/organizations-teams.controller";
import { OrganizationsSchedulesController } from "@/modules/organizations/controllers/schedules/organizations-schedules.controller";
import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { UsersModule } from "@/modules/users/users.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule, SchedulesModule_2024_06_11, UsersModule],
  providers: [OrganizationsRepository, OrganizationsService, OrganizationsSchedulesService],
  exports: [OrganizationsService, OrganizationsRepository],
  controllers: [OrganizationsTeamsController, OrganizationsSchedulesController],
})
export class OrganizationsModule {}
