import { AppsRepository } from "@/modules/apps/apps.repository";
import { ConferencingController } from "@/modules/conferencing/controllers/conferencing.controller";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { Office365VideoService } from "@/modules/conferencing/services/office365-video.service";
import { ZoomVideoService } from "@/modules/conferencing/services/zoom-video.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

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
