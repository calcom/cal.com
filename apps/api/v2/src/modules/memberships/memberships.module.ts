import { Module } from "@nestjs/common";
import { MembershipsRepository } from "src/modules/memberships/memberships.repository";
import { PrismaModule } from "src/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [MembershipsRepository],
  exports: [MembershipsRepository],
})
export class MembershipsModule {}
