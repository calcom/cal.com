import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UserController } from "@/modules/user/user.controller";
import { UserRepository } from "@/modules/user/user.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [UserRepository],
  exports: [UserRepository],
  controllers: [UserController],
})
export class UserModule {}
