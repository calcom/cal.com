import { ConferencingController } from "@/modules/conferencing/controllers/conferencing.controller";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.respository";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [
    ConferencingService,
    ConferencingRepository,
    GoogleMeetService,
    CredentialsRepository,
    UsersRepository,
  ],
  exports: [],
  controllers: [ConferencingController],
})
export class ConferencingModule {}
