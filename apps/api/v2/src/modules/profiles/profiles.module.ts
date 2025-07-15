import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesRepository } from "@/modules/profiles/profilesRepository";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  providers: [ProfilesRepository],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
