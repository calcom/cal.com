import { PrismaModule } from "@/modules/prisma/prisma.module";
import { MembershipRepository } from "@/modules/repositories/membership/membership-repository.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [MembershipRepository],
  exports: [MembershipRepository],
})
export class MembershipModule {}
