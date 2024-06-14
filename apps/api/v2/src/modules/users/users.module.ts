import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { OutputUsersService } from "@/modules/users/controllers/users-outputs.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Module } from "@nestjs/common";

import { UsersController } from "./controllers/users.controller";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, TokensModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, OutputUsersService],
  exports: [UsersRepository],
})
export class UsersModule {}
