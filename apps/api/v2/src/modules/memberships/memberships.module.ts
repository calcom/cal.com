import { Module } from "@nestjs/common";
import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { MembershipsService } from "@/modules/memberships/services/memberships.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [MembershipsRepository, MembershipsService],
  exports: [MembershipsRepository, MembershipsService],
})
export class MembershipsModule {}
