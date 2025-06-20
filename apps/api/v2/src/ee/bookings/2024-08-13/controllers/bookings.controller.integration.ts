import { GoogleApiCacheService } from "@/modules/googleapis-cache/googleapis-cache.service";
import { Injectable } from "@nestjs/common";

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
