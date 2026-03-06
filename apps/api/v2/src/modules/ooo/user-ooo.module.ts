import { Module } from "@nestjs/common";
import { UserOOOController } from "@/modules/ooo/controllers/user-ooo.controller";
import { IsUserOOO } from "@/modules/ooo/guards/is-user-ooo";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [UserOOOService, UserOOORepository, IsUserOOO],
  controllers: [UserOOOController],
})
export class UserOOOModule {}
