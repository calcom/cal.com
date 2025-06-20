import { Injectable } from "@nestjs/common";

import { GoogleApiCacheService } from "@calcom/app-store/_utils/googleapis/NestJsIntegration";

@Injectable()
export class BookingsControllerIntegration {
  constructor(private readonly googleApiCacheService: GoogleApiCacheService) {}

  async handleBookingWithCache(bookingData: any) {
    const cacheManager = this.googleApiCacheService.getCacheManager();

    return {
      ...bookingData,
      googleApiCacheManager: cacheManager,
    };
  }
}
