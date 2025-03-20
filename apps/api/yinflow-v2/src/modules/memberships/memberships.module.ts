import { Module } from "@nestjs/common";

import { MembershipsRepository } from "../memberships/memberships.repository";
import { MembershipsService } from "../memberships/services/memberships.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [MembershipsRepository, MembershipsService],
  exports: [MembershipsRepository, MembershipsService],
})
export class MembershipsModule {}
