import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { AtomsSecondaryEmailsRepository } from "@/modules/atoms/atoms-secondary-emails.repository";
import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { AtomsConferencingAppsController } from "@/modules/atoms/controllers/atoms.conferencing-apps.controller";
import { AtomsController } from "@/modules/atoms/controllers/atoms.controller";
import { AtomsEventTypesController } from "@/modules/atoms/controllers/atoms.event-types.controller";
import { AtomsSchedulesController } from "@/modules/atoms/controllers/atoms.schedules.controller";
import { AtomsVerificationController } from "@/modules/atoms/controllers/atoms.verification.controller";
import { AttributesAtomsService } from "@/modules/atoms/services/attributes-atom.service";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { EventTypesAtomService } from "@/modules/atoms/services/event-types-atom.service";
import { SchedulesAtomsService } from "@/modules/atoms/services/schedules-atom.service";
import { VerificationAtomsService } from "@/modules/atoms/services/verification-atom.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { OrganizationsTeamsRepository } from "@/modules/organizations/teams/index/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, OrganizationsModule, TeamsEventTypesModule],
  providers: [
    OrganizationsTeamsRepository,
    EventTypesAtomService,
    ConferencingAtomsService,
    AttributesAtomsService,
    MembershipsRepository,
    CredentialsRepository,
    UsersRepository,
    AtomsRepository,
    AtomsSecondaryEmailsRepository,
    UsersService,
    SchedulesAtomsService,
    VerificationAtomsService,
    RedisService,
    TeamsRepository,
  ],
  exports: [EventTypesAtomService],
  controllers: [
    AtomsController,
    AtomsEventTypesController,
    AtomsConferencingAppsController,
    AtomsSchedulesController,
    AtomsVerificationController,
  ],
})
export class AtomsModule {}
