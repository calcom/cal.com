import { Module } from "@nestjs/common";

import { MembershipsModule } from "../../memberships/memberships.module";
import { OrganizationsDelegationCredentialController } from "../../organizations/delegation-credentials/organizations-delegation-credential.controller";
import { OrganizationsDelegationCredentialRepository } from "../../organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsRepository } from "../../organizations/index/organizations.repository";
import { PrismaModule } from "../../prisma/prisma.module";
import { RedisModule } from "../../redis/redis.module";
import { StripeModule } from "../../stripe/stripe.module";
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
