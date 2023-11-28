import { ApiKeyModule } from "@/modules/api-key/api-key.module";
import { ApiKeyAuthStrategy } from "@/modules/auth/auth-api-key.strategy";
import { UserModule } from "@/modules/repositories/user/user-repository.module";
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

@Module({
  imports: [PassportModule, ApiKeyModule, UserModule],
  providers: [ApiKeyAuthStrategy],
})
export class AuthModule {}
