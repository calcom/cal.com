import { AppsRepository } from "@/modules/apps/appsRepository";
import { ConferencingModule } from "@/modules/conferencing/conferencing.module";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencingRepository";
import { ConferencingService } from "@/modules/conferencing/services/conferencingService";
import { GoogleMeetService } from "@/modules/conferencing/services/googleMeetService";
import { Office365VideoService } from "@/modules/conferencing/services/office365VideoService";
import { ZoomVideoService } from "@/modules/conferencing/services/zoomVideoService";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { MembershipsRepository } from "@/modules/memberships/membershipsRepository";
import { OrganizationsConferencingController } from "@/modules/organizations/conferencing/organizations-conferencing.controller";
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizationsConferencingService";
import { OrganizationsRepository } from "@/modules/organizations/index/organizationsRepository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizationsTeamsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redisService";
import { StripeService } from "@/modules/stripe/stripeService";
import { TeamsRepository } from "@/modules/teams/teams/teamsRepository";
import { TokensRepository } from "@/modules/tokens/tokensRepository";
import { UsersRepository } from "@/modules/users/usersRepository";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, ConfigModule, ConferencingModule],
  providers: [
    ConferencingService,
    ConferencingRepository,
    GoogleMeetService,
    UsersRepository,
    TeamsRepository,
    OrganizationsConferencingService,
    ZoomVideoService,
    Office365VideoService,
    CredentialsRepository,
    TokensRepository,
    AppsRepository,
    OrganizationsRepository,
    StripeService,
    MembershipsRepository,
    RedisService,
    OrganizationsTeamsRepository,
  ],
  exports: [OrganizationsConferencingService],
  controllers: [OrganizationsConferencingController],
})
export class OrganizationsConferencingModule {}
