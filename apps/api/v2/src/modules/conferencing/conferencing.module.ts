import { AppsRepository } from "@/modules/apps/appsRepository";
import { ConferencingController } from "@/modules/conferencing/controllers/conferencing.controller";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencingRepository";
import { ConferencingService } from "@/modules/conferencing/services/conferencingService";
import { GoogleMeetService } from "@/modules/conferencing/services/googleMeetService";
import { Office365VideoService } from "@/modules/conferencing/services/office365VideoService";
import { ZoomVideoService } from "@/modules/conferencing/services/zoomVideoService";
import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokensRepository";
import { UsersRepository } from "@/modules/users/usersRepository";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [PrismaModule, ConfigModule, HttpModule],
  providers: [
    ConferencingService,
    ConferencingRepository,
    GoogleMeetService,
    CredentialsRepository,
    UsersRepository,
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
    ConferencingRepository,
  ],
  controllers: [ConferencingController],
})
export class ConferencingModule {}
