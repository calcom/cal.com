import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { EndpointsModule } from "./modules/endpoints.module";
import { JwtModule } from "./modules/jwt/jwt.module";

@Module({
  imports: [EndpointsModule, JwtModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
