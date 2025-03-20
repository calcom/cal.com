import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppsRepository } from "../apps/apps.repository";
import { ConferencingController } from "../conferencing/controllers/conferencing.controller";
import { ConferencingRepository } from "../conferencing/repositories/conferencing.repository";
import { ConferencingService } from "../conferencing/services/conferencing.service";
import { GoogleMeetService } from "../conferencing/services/google-meet.service";
import { Office365VideoService } from "../conferencing/services/office365-video.service";
import { ZoomVideoService } from "../conferencing/services/zoom-video.service";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { TokensRepository } from "../tokens/tokens.repository";
import { UsersRepository } from "../users/users.repository";

@Module({
  imports: [PrismaModule, ConfigModule],
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
  exports: [],
  controllers: [ConferencingController],
})
export class ConferencingModule {}
