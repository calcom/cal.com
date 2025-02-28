import { Global, Module } from "@nestjs/common";

import { DirectusController } from "./directus.controller";
import { DirectusService } from "./directus.service";

@Global()
@Module({
  imports: [],
  providers: [DirectusService],
  exports: [DirectusService],
  controllers: [DirectusController],
})
export class DirectusModule {}
