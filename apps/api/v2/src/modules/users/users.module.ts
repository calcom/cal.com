import { Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "src/ee/event-types/event-types_2024_06_14/event-types.module";
import { PrismaModule } from "src/modules/prisma/prisma.module";
import { TokensModule } from "src/modules/tokens/tokens.module";
import { UsersService } from "src/modules/users/services/users.service";
import { UsersRepository } from "src/modules/users/users.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, TokensModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
