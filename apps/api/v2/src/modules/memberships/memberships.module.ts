import { Module } from "@nestjs/common";

import { MembershipsRepository } from "../memberships/memberships.repository";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [MembershipsRepository],
  exports: [MembershipsRepository],
})
export class MembershipsModule {}
