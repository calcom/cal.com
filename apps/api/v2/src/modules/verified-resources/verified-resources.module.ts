import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeService } from "@/modules/stripe/stripe.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { UserVerifiedResourcesController } from "@/modules/verified-resources/controllers/users-verified-resources.controller";
import { VerifiedResourcesService } from "@/modules/verified-resources/services/verified-resources.service";
import { TeamsVerifiedResourcesRepository } from "@/modules/verified-resources/teams-verified-resources.repository";
import { UsersVerifiedResourcesRepository } from "@/modules/verified-resources/users-verified-resources.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [
    UserVerifiedResourcesController,
  ],
  providers: [
    VerifiedResourcesService,
    UsersVerifiedResourcesRepository,
    TeamsVerifiedResourcesRepository,
    MembershipsRepository,
    OrganizationsRepository,
    StripeService,
    AppsRepository,
    CredentialsRepository,
    UsersRepository,
  ],
  exports: [VerifiedResourcesService],
})
export class VerifiedResourcesModule {}
