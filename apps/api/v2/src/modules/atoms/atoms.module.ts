import { EventTypesModule_2024_06_14 } from "@/platform/event-types/event-types_2024_06_14/event-types.module";
import { AtomsSecondaryEmailsRepository } from "@/modules/atoms/atoms-secondary-emails.repository";
import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { AtomsConferencingAppsController } from "@/modules/atoms/controllers/atoms.conferencing-apps.controller";
import { AtomsEventTypesController } from "@/modules/atoms/controllers/atoms.event-types.controller";
import { AtomsSchedulesController } from "@/modules/atoms/controllers/atoms.schedules.controller";
import { AtomsVerificationController } from "@/modules/atoms/controllers/atoms.verification.controller";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { EventTypesAtomService } from "@/modules/atoms/services/event-types-atom.service";
import { SchedulesAtomsService } from "@/modules/atoms/services/schedules-atom.service";
import { VerificationAtomsService } from "@/modules/atoms/services/verification-atom.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14],
  providers: [
    EventTypesAtomService,
    ConferencingAtomsService,
    MembershipsRepository,
    CredentialsRepository,
    UsersRepository,
    AtomsRepository,
    AtomsSecondaryEmailsRepository,
    UsersService,
    SchedulesAtomsService,
    VerificationAtomsService,
    RedisService,
  ],
  exports: [EventTypesAtomService],
  controllers: [
    AtomsEventTypesController,
    AtomsConferencingAppsController,
    AtomsSchedulesController,
    AtomsVerificationController,
  ],
})
export class AtomsModule {}
