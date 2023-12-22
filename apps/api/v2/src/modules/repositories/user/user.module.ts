import { UserRepository } from "@/modules/repositories/user/user.repository";
import { PrismaModule } from "@/modules/services/prisma/prisma.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
