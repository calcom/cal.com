import { Module } from "@nestjs/common";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RoutingFormsController } from "@/modules/routing-forms/controllers/routing-forms.controller";
import { RoutingFormsRepository } from "@/modules/routing-forms/routing-forms.repository";
import { RoutingFormsService } from "@/modules/routing-forms/services/routing-forms.service";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";

@Module({
  imports: [PrismaModule, TeamsEventTypesModule, SlotsModule_2024_09_04, StripeModule],
  providers: [RoutingFormsRepository, RoutingFormsService, OrganizationsRepository],
  controllers: [RoutingFormsController],
  exports: [RoutingFormsRepository],
})
export class RoutingFormsModule {}
