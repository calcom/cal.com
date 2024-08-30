import { Module } from "@nestjs/common";
import { EventTypesModule_2024_06_14 } from "app/ee/event-types/event-types_2024_06_14/event-types.module";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { TokensModule } from "app/modules/tokens/tokens.module";
import { UsersService } from "app/modules/users/services/users.service";
import { UsersRepository } from "app/modules/users/users.repository";

@Module({
  imports: [PrismaModule, EventTypesModule_2024_06_14, TokensModule],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
