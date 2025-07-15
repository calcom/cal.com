import { CredentialsRepository } from "@/modules/credentials/credentialsRepository";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [CredentialsRepository],
  exports: [CredentialsRepository],
})
export class CredentialsModule {}
