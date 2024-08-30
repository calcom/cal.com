import { Global, Module } from "@nestjs/common";
import { JwtModule as NestJwtModule } from "@nestjs/jwt";
import { getEnv } from "app/env";
import { JwtService } from "app/modules/jwt/jwt.service";

@Global()
@Module({
  imports: [NestJwtModule.register({ secret: getEnv("JWT_SECRET") })],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
