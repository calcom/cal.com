import { Module } from "@nestjs/common";
import { CredentialsRepository } from "src/modules/credentials/credentials.repository";

@Module({
  imports: [],
  providers: [CredentialsRepository],
  exports: [CredentialsRepository],
})
export class CredentialsModule {}
