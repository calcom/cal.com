import { Module } from "@nestjs/common";
import { PrismaModule } from "app/modules/prisma/prisma.module";
import { ProfilesRepository } from "app/modules/profiles/profiles.repository";

@Module({
  imports: [PrismaModule],
  providers: [ProfilesRepository],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
