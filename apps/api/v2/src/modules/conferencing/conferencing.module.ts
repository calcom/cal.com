import { AppsRepository } from "@/modules/apps/apps.repository";
import { ConferencingController } from "@/modules/conferencing/controllers/conferencing.controller";
import { PrismaConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { Office365VideoService } from "@/modules/conferencing/services/office365-video.service";
import { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { PrismaUsersRepository } from "@/modules/users/users.repository";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, ConfigModule, HttpModule],
  providers: [
    ConferencingService,
    PrismaConferencingRepository,
    GoogleMeetService,
    CredentialsRepository,
    PrismaUsersRepository,
    TokensRepository,
    ZoomVideoService,
    Office365VideoService,
    AppsRepository,
  ],
  exports: [
    ZoomVideoService,
    Office365VideoService,
    GoogleMeetService,
    ConferencingService,
    PrismaConferencingRepository,
  ],
  controllers: [ConferencingController],
})
export class ConferencingModule {}
