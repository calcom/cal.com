import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesRepository_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.repository";
import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { AtomsController } from "@/modules/atoms/controllers/atoms.controller";
import { EventTypesAtomService } from "@/modules/atoms/services/event-types-atom.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { OrganizationsTeamsRepository } from "@/modules/organizations/repositories/organizations-teams.repository";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14],
  providers: [
    EventTypesAtomService,
    MembershipsRepository,
    CredentialsRepository,
    OrganizationsTeamsRepository,
    AtomsRepository,
    UsersRepository,
    UsersService,
    SchedulesRepository_2024_06_11,
  ],
  exports: [EventTypesAtomService],
  controllers: [AtomsController],
})
export class AtomsModule {}
