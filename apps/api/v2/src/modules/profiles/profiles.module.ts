import { Module } from "@nestjs/common";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { ProfilesRepository } from "@/modules/profiles/profiles.repository";

@Module({
  imports: [PrismaModule],
  providers: [ProfilesRepository],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
