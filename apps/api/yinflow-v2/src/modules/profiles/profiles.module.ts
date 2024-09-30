import { Module } from "@nestjs/common";

import { ProfilesRepository } from "../profiles/profiles.repository";

@Module({
  providers: [ProfilesRepository],
  exports: [ProfilesRepository],
})
export class ProfilesModule {}
