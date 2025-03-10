import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsDelegationCredentialController } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.controller";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

import { OrganizationsDelegationCredentialService } from "./services/organizations-delegation-credential.service";

@Module({
  imports: [PrismaModule, StripeModule, RedisModule, MembershipsModule],
  providers: [
    OrganizationsDelegationCredentialService,
    OrganizationsDelegationCredentialRepository,
    OrganizationsRepository,
  ],
  controllers: [OrganizationsDelegationCredentialController],
})
export class OrganizationsDelegationCredentialModule {}
