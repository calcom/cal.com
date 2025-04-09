import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RoutingFormsResponsesModule } from "@/modules/routing-forms-responses/routing-forms-responses.module";
import { RoutingFormsModule } from "@/modules/routing-forms/routing-forms.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsRoutingFormsResponsesController } from "./controllers/organizations-routing-forms-responses.controller";
import { OrganizationsRoutingFormsController } from "./controllers/organizations-routing-forms.controller";
import { OrganizationsRoutingFormsRepository } from "./organizations-routing-forms.repository";
import { OrganizationsRoutingFormsResponsesService } from "./services/organizations-routing-forms-responses.service";
import { OrganizationsRoutingFormsService } from "./services/organizations-routing-forms.service";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, RoutingFormsModule, RoutingFormsResponsesModule],
  providers: [
    MembershipsRepository,
    OrganizationsRepository,
    OrganizationsRoutingFormsRepository,
    OrganizationsRoutingFormsService,
    OrganizationsRoutingFormsResponsesService,
  ],
  controllers: [OrganizationsRoutingFormsController, OrganizationsRoutingFormsResponsesController],
})
export class OrganizationsRoutingFormsModule {}
