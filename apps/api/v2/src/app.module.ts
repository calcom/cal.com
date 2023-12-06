import appConfig from "@/config/app";
import { AuthModule } from "@/modules/auth/auth.module";
import { EndpointsModule } from "@/modules/endpoints-module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [appConfig],
    }),
    PrismaModule,
    EndpointsModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
