import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { AtomsConferencingAppsController } from "@/modules/atoms/controllers/atoms.conferencing-apps.controller";
import { AtomsController } from "@/modules/atoms/controllers/atoms.controller";
import { AtomsEventTypesController } from "@/modules/atoms/controllers/atoms.event-types.controller";
import { AtomsSchedulesController } from "@/modules/atoms/controllers/atoms.schedules.controller";
import { AttributesAtomsService } from "@/modules/atoms/services/attributes-atom.service";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { EventTypesAtomService } from "@/modules/atoms/services/event-types-atom.service";
import { SchedulesAtomsService } from "@/modules/atoms/services/schedules-atom.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsModule } from "@/modules/organizations/organizations.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, OrganizationsModule, TeamsEventTypesModule],
  providers: [
    EventTypesAtomService,
    ConferencingAtomsService,
    AttributesAtomsService,
    MembershipsRepository,
    CredentialsRepository,
    UsersRepository,
    AtomsRepository,
    UsersService,
    SchedulesAtomsService,
    RedisService,
  ],
  exports: [EventTypesAtomService],
  controllers: [
    AtomsController,
    AtomsEventTypesController,
    AtomsConferencingAppsController,
    AtomsSchedulesController,
  ],
})
export class AtomsModule {}
