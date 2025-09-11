import { PrismaClient } from "@calcom/prisma";
import type { GetBookingsInput } from "@/schema/booking.schema";

import { BaseService } from "../base.service";

import { BookingRepository } from "@/repositories/booking.repository";
import { EventTypeRepository, OAuthClientRepository } from "@/repositories";
import { PlatformOAuthClient } from "@calcom/prisma/client";
import type { RescheduleBookingInput } from "@calcom/platform-types";

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

  async bookingExists(userId: number, id: number): Promise<boolean> {
    try {
      return await this.bookingRepository.existsByUserIdAndId(userId, id);
    } catch (error) {
      this.logError("eventTypeExists", error);
      throw error;
    }
  }

  async buildRescheduleBookingRequest(params: {
    originalBookingId: number;
    body: RescheduleBookingInput & { rescheduledBy?: string };
    headers: Record<string, string | undefined>;
  }): Promise<{
    body: Record<string, unknown>;
    userId: number | undefined;
    headers: { host?: string };
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
    platformBookingLocation?: string | undefined;
    arePlatformEmailsEnabled: boolean;
    areCalendarEventsEnabled: boolean;
  }> {
    const { originalBookingId, body, headers } = params;

    const booking = await this.bookingRepository.getBookingById(originalBookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }
    if (!booking.eventTypeId) {
      throw new Error("Booking is missing event type");
    }

    // Fetch event type to get duration and defaults
    const eventType = await this.eventTypesRepository.findById(booking.eventTypeId);
    if (!eventType) {
      throw new Error("Event type not found");
    }

    // Determine attendee context from original booking
    const firstAttendee = booking.attendees?.[0];
    const responses = (booking as any).responses || {};
    const attendeeEmail: string | undefined = responses.email || firstAttendee?.email;
    const attendeeName: string | undefined = responses.name || firstAttendee?.name;
    const attendeePhoneNumber: string | undefined = responses.attendeePhoneNumber || firstAttendee?.phoneNumber;
    const attendeeTimeZone: string | undefined = firstAttendee?.timeZone || (booking as any).timeZone || undefined;
    const attendeeLanguage: string | undefined = firstAttendee?.locale || (booking as any).language || "en";

    const startIso = (body as any).start as string;
    if (!startIso) {
      throw new Error("start is required to reschedule");
    }

    const lengthInMinutes = eventType.length || 0;
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + lengthInMinutes * 60 * 1000);

    // OAuth client params (if any)
    const platformClientParams = await this.getOAuthClientParams(eventType.id);

    // Determine who is rescheduling; if different from attendee, omit for now (no users repository here)
    const rescheduledBy = (body as any).rescheduledBy as string | undefined;
    const resolvedUserId = undefined;

    const rescheduleUid = (body as any).seatUid ? (body as any).seatUid : (booking as any).uid;

    const transformedBody: Record<string, unknown> = {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      eventTypeId: eventType.id,
      timeZone: attendeeTimeZone,
      language: attendeeLanguage,
      metadata: (booking as any).metadata || {},
      hasHashedBookingLink: false,
      guests: responses.guests || [],
      responses: {
        ...responses,
        name: attendeeName,
        email: attendeeEmail,
        attendeePhoneNumber,
        rescheduledReason: (body as any).reschedulingReason,
      },
      rescheduleUid,
    };

    return {
      body: transformedBody,
      userId: resolvedUserId,
      headers: { host: headers.host },
      platformClientId: platformClientParams?.platformClientId,
      platformRescheduleUrl: platformClientParams?.platformRescheduleUrl,
      platformCancelUrl: platformClientParams?.platformCancelUrl,
      platformBookingUrl: platformClientParams?.platformBookingUrl,
      platformBookingLocation: (booking as any).location || undefined,
      arePlatformEmailsEnabled: platformClientParams?.arePlatformEmailsEnabled ?? true,
      areCalendarEventsEnabled: platformClientParams?.areCalendarEventsEnabled ?? true,
    };
  }
}