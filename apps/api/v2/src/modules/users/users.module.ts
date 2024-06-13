import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { OutputUsersService } from "@/modules/users/controllers/users-outputs.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

import { EventTypesModule } from "../../ee/event-types/event-types.module";
import { UsersController } from "./controllers/users.controller";

@Module({
  imports: [PrismaModule, EventTypesModule, TokensModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, OutputUsersService],
  exports: [UsersRepository],
})
export class UsersModule {}
