import { MembershipRepository } from "@/modules/repositories/membership/membership.repository";
import { PrismaModule } from "@/modules/services/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [MembershipRepository],
  exports: [MembershipRepository],
})
export class MembershipModule {}
