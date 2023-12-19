import { CredentialRepository } from "@/modules/credential/credential.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [CredentialRepository],
  exports: [CredentialRepository],
})
export class CredentialModule {}
