import { Module } from "@nestjs/common";

import { GoogleApiCacheService } from "./googleapis-cache.service";

@Module({
  providers: [GoogleApiCacheService],
  exports: [GoogleApiCacheService],
})
export class GoogleApiCacheModule {}
