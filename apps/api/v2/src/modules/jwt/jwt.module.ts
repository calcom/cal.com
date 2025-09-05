import { Global, Module } from "@nestjs/common";
import { JwtModule as NestJwtModule } from "@nestjs/jwt";
import { getEnv } from "@/env";
import { JwtService } from "@/modules/jwt/jwt.service";

@Global()
@Module({
  imports: [NestJwtModule.register({ secret: getEnv("JWT_SECRET") })],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
