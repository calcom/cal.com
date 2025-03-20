import { Module } from "@nestjs/common";

import { EventTypesModule_2024_06_14 } from "../../ee/event-types/event-types_2024_06_14/event-types.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TokensModule } from "../tokens/tokens.module";
import { UsersService } from "../users/services/users.service";
import { UsersRepository } from "../users/users.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, TokensModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
