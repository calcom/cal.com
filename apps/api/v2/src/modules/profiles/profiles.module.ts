import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { ProfilesRepository } from "../profiles/profiles.repository";

@Module({
  imports: [PrismaModule],
  providers: [ProfilesRepository],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
