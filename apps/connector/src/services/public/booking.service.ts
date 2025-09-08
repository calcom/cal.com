import { PrismaClient } from "@calcom/prisma";
import type { GetBookingsInput } from "@/schema/booking.schema";

import { BaseService } from "../base.service";

import { BookingRepository } from "@/repositories/booking.repository";
import { EventTypeRepository, OAuthClientRepository } from "@/repositories";
import { PlatformOAuthClient } from "@calcom/prisma/client";

export class BookingService extends BaseService {
  private bookingRepository: BookingRepository;
  private oAuthClientRepository: OAuthClientRepository;
  private eventTypesRepository: EventTypeRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.bookingRepository = new BookingRepository(prisma);
    this.oAuthClientRepository = new OAuthClientRepository(prisma);
    this.eventTypesRepository = new EventTypeRepository(prisma);
  }

  async getUserBookings(
    queryParams: GetBookingsInput,
    user: { id: number; email: string; orgId?: number | null }
  ) {
    try {
      const data = await this.bookingRepository.getUserBookings(queryParams, user);
      return data;
    } catch (error) {
      this.logError("create", error);
      throw error;
    }
  }

  async getBookingById(id: number, expand: string[] = []) {
    try {
      const booking = await this.bookingRepository.getBookingById(id, expand);
      return booking;
    } catch (error) {
      this.logError("getBookingById", error);
      throw error;
    }
  }

  async deleteBookingById(id: number) {
    try {
      const deleted = await this.bookingRepository.deleteBookingById(id);
      return deleted;
    } catch (error) {
      this.logError("deleteBookingById", error);
      throw error;
    }
  }

  async getOAuthClientParams(eventTypeId: number) {
    const eventType = await this.eventTypesRepository.findById(eventTypeId);

    let oAuthClient: PlatformOAuthClient | null = null;
    if (eventType?.userId) {
      oAuthClient = await this.oAuthClientRepository.getByUserId(eventType.userId);
    } else if (eventType?.teamId) {
      oAuthClient = await this.oAuthClientRepository.getByTeamId(eventType.teamId);
    }
    // Last resort check the hosts of the event-type
    if (!oAuthClient && eventType?.teamId) {
      oAuthClient = await this.oAuthClientRepository.getByEventTypeHosts(eventTypeId);
    }

    if (oAuthClient) {
      return {
        platformClientId: oAuthClient.id,
        platformCancelUrl: oAuthClient.bookingCancelRedirectUri,
        platformRescheduleUrl: oAuthClient.bookingRescheduleRedirectUri,
        platformBookingUrl: oAuthClient.bookingRedirectUri,
        arePlatformEmailsEnabled: oAuthClient.areEmailsEnabled,
        areCalendarEventsEnabled: oAuthClient.areCalendarEventsEnabled,
      };
    }

    return undefined;
  }
}