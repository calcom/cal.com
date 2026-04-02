import { CreateBookingInput } from "@calcom/platform-types";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

@Injectable()
export class ErrorsBookingsService_2024_08_13 {
  private readonly logger = new Logger("ErrorsBookingsService_2024_08_13");

  handleEventTypeToBeBookedNotFound(body: CreateBookingInput): never {
    if (body.username && body.eventTypeSlug && !body.organizationSlug) {
      throw new NotFoundException(
        `Event type with slug ${body.eventTypeSlug} belonging to user ${body.username} not found.`
      );
    }
    if (body.username && body.eventTypeSlug && body.organizationSlug) {
      throw new NotFoundException(
        `Event type with slug ${body.eventTypeSlug} belonging to user ${body.username} within organization ${body.organizationSlug} not found.`
      );
    }
    if (body.teamSlug && body.eventTypeSlug && !body.organizationSlug) {
      throw new NotFoundException(
        `Event type with slug ${body.eventTypeSlug} belonging to team ${body.teamSlug} not found.`
      );
    }
    if (body.teamSlug && body.eventTypeSlug && body.organizationSlug) {
      throw new NotFoundException(
        `Event type with slug ${body.eventTypeSlug} belonging to team ${body.teamSlug} within organization ${body.organizationSlug} not found.`
      );
    }
    throw new NotFoundException(`Event type with id ${body.eventTypeId} not found.`);
  }

  handleBookingError(error: unknown, bookingTeamEventType: boolean): never {
    const hostsUnavaile = "One of the hosts either already has booking at this time or is not available";

    if (error instanceof Error) {
      if (error.message === "no_available_users_found_error") {
        if (bookingTeamEventType) {
          throw new BadRequestException(hostsUnavaile);
        }
        throw new BadRequestException("User either already has booking at this time or is not available");
      } else if (error.message === "booking_time_out_of_bounds_error") {
        throw new BadRequestException(
          `The event type can't be booked at the "start" time provided. This could be because it's too soon (violating the minimum booking notice) or too far in the future (outside the event's scheduling window). Try fetching available slots first using the GET /v2/slots endpoint and then make a booking with "start" time equal to one of the available slots: https://cal.com/docs/api-reference/v2/slots`
        );
      } else if (error.message === "Attempting to book a meeting in the past.") {
        throw new BadRequestException("Attempting to book a meeting in the past.");
      } else if (error.message === "hosts_unavailable_for_booking") {
        throw new BadRequestException(hostsUnavaile);
      } else if (error.message === "booker_limit_exceeded_error") {
        throw new BadRequestException(
          "Attendee with this email can't book because the maximum number of active bookings has been reached."
        );
      } else if (error.message === "booker_limit_exceeded_error_reschedule") {
        const errorData =
          "data" in error ? (error.data as { rescheduleUid: string }) : { rescheduleUid: undefined };
        let message =
          "Attendee with this email can't book because the maximum number of active bookings has been reached.";
        if (errorData?.rescheduleUid) {
          message += ` You can reschedule your existing booking (${errorData.rescheduleUid}) to a new timeslot instead.`;
        }
        throw new BadRequestException(message);
      }
    }
    throw error;
  }
}
