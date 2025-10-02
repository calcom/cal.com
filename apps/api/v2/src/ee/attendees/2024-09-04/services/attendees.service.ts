import { AttendeesRepository_2024_09_04 } from "@/ee/attendees/2024-09-04/attendees.repository";
import { CreateAttendeeInput_2024_09_04 } from "@/ee/attendees/2024-09-04/inputs/create-attendee.input";
import { UpdateAttendeeInput_2024_09_04 } from "@/ee/attendees/2024-09-04/inputs/update-attendee.input";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { EventType } from "@calcom/prisma/client";

@Injectable()
export class AttendeesService_2024_09_04 {
  private readonly logger = new Logger("AttendeesService_2024_09_04");

  constructor(
    private readonly attendeesRepository: AttendeesRepository_2024_09_04,
    private readonly bookingsService: BookingsService_2024_08_13
  ) {}

  async checkEventTypeOwnership(eventType: EventType, user: ApiAuthGuardUser) {
    const isAdminOrOwner = await this.bookingsService.userIsEventTypeAdminOrOwner(user, eventType);
    if (!isAdminOrOwner) {
      throw new ForbiddenException(
        "checkEventTypeOwnership - user is not authorized to access this event type. User has to be either event type owner, host, team admin or owner or org admin or owner."
      );
    }

    return true;
  }

  async createAttendee(data: CreateAttendeeInput_2024_09_04, user: ApiAuthGuardUser) {
    const booking = await this.attendeesRepository.getBookingWithEventType(data.bookingId);
    if (!booking?.eventType) {
      throw new NotFoundException(`Booking with id ${data.bookingId} not found`);
    }
    await this.checkEventTypeOwnership(booking.eventType, user);

    try {
      const createdAttendee = await this.attendeesRepository.createAttendee(data);

      return createdAttendee;
    } catch (error) {
      this.logger.error("Failed to create attendee", error);
      throw new BadRequestException("Failed to create attendee");
    }
  }

  async getAttendeeById(id: number, user: ApiAuthGuardUser) {
    const attendee = await this.attendeesRepository.getAttendeeWithBookingWithEventType(id);
    if (!attendee) {
      throw new NotFoundException(`Attendee with id ${id} not found`);
    }
    if (!attendee.booking?.eventType) {
      throw new NotFoundException(`Booking does not exist for attendee with id ${id}`);
    }
    await this.checkEventTypeOwnership(attendee.booking.eventType, user);

    return attendee;
  }

  async updateAttendee(id: number, data: UpdateAttendeeInput_2024_09_04, user: ApiAuthGuardUser) {
    const attendee = await this.attendeesRepository.getAttendeeWithBookingWithEventType(id);

    if (!attendee) {
      throw new NotFoundException(`Attendee with id ${id} not found`);
    }

    if (!attendee.booking?.eventType) {
      throw new NotFoundException(`Booking does not exist for attendee with id ${id}`);
    }
    await this.checkEventTypeOwnership(attendee.booking.eventType, user);

    try {
      const updatedAttendee = await this.attendeesRepository.updateAttendee(id, data);

      return updatedAttendee;
    } catch (error) {
      this.logger.error("Failed to update attendee", error);
      throw new BadRequestException("Failed to update attendee");
    }
  }

  async deleteAttendee(id: number, user: ApiAuthGuardUser) {
    const attendee = await this.attendeesRepository.getAttendeeWithBookingWithEventType(id);

    if (!attendee) {
      throw new NotFoundException(`Attendee with id ${id} not found`);
    }

    if (!attendee.booking?.eventType) {
      throw new NotFoundException(`Booking does not exist for attendee with id ${id}`);
    }
    await this.checkEventTypeOwnership(attendee.booking.eventType, user);

    try {
      const attendeeToDelete = await this.attendeesRepository.deleteAttendee(id);

      return attendeeToDelete;
    } catch (error) {
      this.logger.error("Failed to delete attendee", error);
      throw new BadRequestException("Failed to delete attendee");
    }
  }
}
