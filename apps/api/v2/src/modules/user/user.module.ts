import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UserRepository } from "@/modules/user/user.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
