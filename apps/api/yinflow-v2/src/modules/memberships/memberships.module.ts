import { Module } from "@nestjs/common";

import { MembershipsRepository } from "../memberships/memberships.repository";

@Module({
  providers: [MembershipsRepository],
  exports: [MembershipsRepository],
})
export class MembershipsModule {}
