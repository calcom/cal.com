import { Module } from "@nestjs/common";
import { MembershipsRepository } from "app/modules/memberships/memberships.repository";
import { PrismaModule } from "app/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [MembershipsRepository],
  exports: [MembershipsRepository],
})
export class MembershipsModule {}
