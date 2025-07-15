import { MembershipsRepository } from "@/modules/memberships/membershipsRepository";
import { MembershipsService } from "@/modules/memberships/services/membershipsService";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [MembershipsRepository, MembershipsService],
  exports: [MembershipsRepository, MembershipsService],
})
export class MembershipsModule {}
