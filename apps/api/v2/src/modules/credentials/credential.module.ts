import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [CredentialsRepository],
  exports: [CredentialsRepository],
})
export class CredentialsModule {}
