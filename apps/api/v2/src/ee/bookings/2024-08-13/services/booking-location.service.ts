import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { enrichUsersWithDelegationCredentials } from "@calcom/platform-libraries/app-store";
import { getDefaultConferencingAppLocation } from "@calcom/platform-libraries/conferencing";
import {
  getLocationValueForDB,
  getOrgIdFromMemberOrTeamId,
  getBookingDataLocation,
} from "@calcom/platform-libraries/locations";
import type {
  UpdateBookingLocationInput_2024_08_13,
  BookingInputLocation_2024_08_13,
} from "@calcom/platform-types";
import { Booking } from "@calcom/prisma/client";

type LocationObject = {
  type: string;
  address?: string;
  displayLocationPublicly?: boolean;
  credentialId?: number;
  customLabel?: string;
} & Partial<
  Record<
    "address" | "attendeeAddress" | "link" | "hostPhoneNumber" | "hostDefault" | "phone" | "somewhereElse",
    string
  >
>;

@Injectable()
export class BookingLocationService_2024_08_13 {
  private readonly logger = new Logger("BookingGuestsService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly usersRepository: UsersRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly credentialsRepository: CredentialsRepository,
    private readonly inputService: InputBookingsService_2024_08_13
  ) {}

  async updateBookingLocation(
    bookingUid: string,
    input: UpdateBookingLocationInput_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const existingBooking = await this.bookingsRepository.getByUid(bookingUid);
    if (!existingBooking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }
    const { location } = input;

    if (location) {
      return await this.updateLocation(existingBooking, location, user);
    }

    return this.bookingsService.getBooking(existingBooking.uid, user);
  }

  async updateLocation(
    existingBooking: Booking,
    location: BookingInputLocation_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const bookingUid = existingBooking.uid;
    let bookingLocation = existingBooking.location ?? "";

    if (!existingBooking.userId) {
      throw new NotFoundException(`No user found for booking with uid=${bookingUid}`);
    }

    if (!existingBooking.eventTypeId) {
      throw new NotFoundException(`No event type found for booking with uid=${bookingUid}`);
    }

    const existingBookingHost = await this.usersRepository.findById(existingBooking.userId);

    if (!existingBookingHost) {
      throw new NotFoundException(`No user found for booking with uid=${bookingUid}`);
    }

    const existingBookingEventType = await this.eventTypesRepository.getEventTypeById(
      existingBooking.eventTypeId
    );

    if (location.type === "organizersDefaultApp") {
      const existingBookingHostCredentials = await this.credentialsRepository.getAllUserCredentialsById(
        existingBookingHost.id
      );
      const existingBookingUserOrgId = await getOrgIdFromMemberOrTeamId({
        memberId: existingBooking.userId ?? null,
        teamId: existingBookingEventType?.teamId,
      });
      const enrichedUser = await enrichUsersWithDelegationCredentials({
        orgId: existingBookingUserOrgId ?? null,
        users: [
          {
            id: existingBookingHost.id,
            email: existingBookingHost.email,
            credentials: existingBookingHostCredentials,
          },
        ],
      });

      bookingLocation = getDefaultConferencingAppLocation(
        existingBookingHost?.metadata,
        enrichedUser?.[0]?.credentials ?? []
      );
    } else {
      const transformedLocation = this.inputService.transformLocation(location);
      const locationValue = getBookingDataLocation(transformedLocation);
      const { bookingLocation: bookingLocationForDB } = getLocationValueForDB(
        locationValue,
        existingBookingEventType?.locations as unknown as LocationObject[]
      );
      bookingLocation = bookingLocationForDB;
    }

    const updatedBooking = await this.bookingsRepository.updateBooking(bookingUid, {
      location: bookingLocation,
    });

    return this.bookingsService.getBooking(updatedBooking.uid, user);
  }
}
