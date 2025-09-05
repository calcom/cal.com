import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { ConferencingModule } from "@/modules/conferencing/conferencing.module";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { Office365VideoService } from "@/modules/conferencing/services/office365-video.service";
import { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsConferencingController } from "@/modules/organizations/conferencing/organizations-conferencing.controller";
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { StripeService } from "@/modules/stripe/stripe.service";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersRepository } from "@/modules/users/users.repository";

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
