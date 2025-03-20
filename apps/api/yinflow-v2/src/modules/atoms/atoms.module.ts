import { Module } from "@nestjs/common";

import { EventTypesModule_2024_06_14 } from "../../ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesRepository_2024_06_11 } from "../../ee/schedules/schedules_2024_06_11/schedules.repository";
import { AtomsRepository } from "../atoms/atoms.repository";
import { AtomsController } from "../atoms/controllers/atoms.controller";
import { ConferencingAtomsService } from "../atoms/services/conferencing-atom.service";
import { EventTypesAtomService } from "../atoms/services/event-types-atom.service";
import { CredentialsRepository } from "../credentials/credentials.repository";
import { MembershipsRepository } from "../memberships/memberships.repository";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TeamsEventTypesModule } from "../teams/event-types/teams-event-types.module";
import { UsersService } from "../users/services/users.service";
import { UsersRepository } from "../users/users.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, OrganizationsModule, TeamsEventTypesModule],
  providers: [
    EventTypesAtomService,
    ConferencingAtomsService,
    MembershipsRepository,
    CredentialsRepository,
    UsersRepository,
    AtomsRepository,
    UsersService,
    SchedulesRepository_2024_06_11,
  ],
  exports: [EventTypesAtomService],
  controllers: [AtomsController],
})
export class AtomsModule {}
