import { CalendarsModule } from "@/ee/calendars/calendars.module";
import { CALENDARS_QUEUE, CalendarsProcessor } from "@/ee/calendars/processors/calendars.processor";
import { MembershipsModule } from "@/modules/memberships/memberships.module";
import { OrganizationsDelegationCredentialController } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.controller";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { StripeModule } from "@/modules/stripe/stripe.module";
import { QueueMockService } from "@/serverless/queue-mock.service";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";

import { OrganizationsDelegationCredentialService } from "./services/organizations-delegation-credential.service";

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    RedisModule,
    CalendarsModule,
    MembershipsModule,
    ...(!isServerless
      ? [
          BullModule.registerQueue({
            name: CALENDARS_QUEUE,
            limiter: {
              max: 1,
              duration: 1000,
            },
          }),
        ]
      : []),
  ],
  providers: [
    OrganizationsDelegationCredentialService,
    OrganizationsDelegationCredentialRepository,
    OrganizationsRepository,
    ...(isServerless ? [] : [CalendarsProcessor]),
    ...(isServerless ? [QueueMockService] : []),
  ],
  controllers: [OrganizationsDelegationCredentialController],
})
export class OrganizationsDelegationCredentialModule {}
