import type { Logger } from "tslog";

import type { BookingAuditService } from "@calcom/features/booking-audit/lib/service/BookingAuditService";
import type { StatusChangeAuditData } from "@calcom/features/booking-audit/lib/actions/StatusChangeAuditActionService";
import type { CancelledAuditData } from "@calcom/features/booking-audit/lib/actions/CancelledAuditActionService";
import type { RejectedAuditData } from "@calcom/features/booking-audit/lib/actions/RejectedAuditActionService";
import type { RescheduleRequestedAuditData } from "@calcom/features/booking-audit/lib/actions/RescheduleRequestedAuditActionService";
import type { AttendeeAddedAuditData } from "@calcom/features/booking-audit/lib/actions/AttendeeAddedAuditActionService";
import type { AttendeeRemovedAuditData } from "@calcom/features/booking-audit/lib/actions/AttendeeRemovedAuditActionService";
import type { ReassignmentAuditData } from "@calcom/features/booking-audit/lib/actions/ReassignmentAuditActionService";
import type { LocationChangedAuditData } from "@calcom/features/booking-audit/lib/actions/LocationChangedAuditActionService";
import type { HostNoShowUpdatedAuditData } from "@calcom/features/booking-audit/lib/actions/HostNoShowUpdatedAuditActionService";
import type { AttendeeNoShowUpdatedAuditData } from "@calcom/features/booking-audit/lib/actions/AttendeeNoShowUpdatedAuditActionService";
import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { BookingStatus } from "@calcom/prisma/enums";

import type { Actor } from "../types/actor";
import type { BookingCreatedPayload, BookingRescheduledPayload } from "./types";

interface BookingEventHandlerDeps {
  log: Logger<unknown>;
  hashedLinkService: HashedLinkService;
  bookingAuditService: BookingAuditService;
}

// Type guard functions for discriminating audit data types
function isStatusChangeAuditData(
  data: StatusChangeAuditData | CancelledAuditData | RejectedAuditData | undefined
): data is StatusChangeAuditData {
  return data !== undefined && "status" in data && !("cancellationReason" in data) && !("rejectionReason" in data);
}

function isCancelledAuditData(
  data: StatusChangeAuditData | CancelledAuditData | RejectedAuditData | undefined
): data is CancelledAuditData {
  return data !== undefined && "cancellationReason" in data;
}

function isRejectedAuditData(
  data: StatusChangeAuditData | CancelledAuditData | RejectedAuditData | undefined
): data is RejectedAuditData {
  return data !== undefined && "rejectionReason" in data;
}

export class BookingEventHandlerService {
  private readonly log: BookingEventHandlerDeps["log"];
  private readonly hashedLinkService: BookingEventHandlerDeps["hashedLinkService"];
  private readonly bookingAuditService: BookingEventHandlerDeps["bookingAuditService"];

  constructor(private readonly deps: BookingEventHandlerDeps) {
    this.log = deps.log;
    this.hashedLinkService = deps.hashedLinkService;
    this.bookingAuditService = deps.bookingAuditService;
  }

  // TODO: actor to be made required in followup PR
  async onBookingCreated(payload: BookingCreatedPayload, actor?: Actor) {
    this.log.debug("onBookingCreated", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);

    if (!actor) {
      return;
    }

    try {
      const auditData = {
        startTime: payload.booking.startTime.toISOString(),
        endTime: payload.booking.endTime.toISOString(),
        status: payload.booking.status,
      };
      await this.bookingAuditService.onBookingCreated(
        payload.booking.uid,
        actor,
        auditData
      );
    } catch (error) {
      this.log.error("Error while creating booking audit", safeStringify(error));
    }
  }

  async onBookingRescheduled(payload: BookingRescheduledPayload, actor?: Actor) {
    this.log.debug("onBookingRescheduled", safeStringify(payload));
    await this.onBookingCreatedOrRescheduled(payload);

    if (!actor) {
      return;
    }

    try {
      const auditData = {
        startTime: {
          old: payload.oldBooking.startTime.toISOString(),
          new: payload.booking.startTime.toISOString(),
        },
        endTime: {
          old: payload.oldBooking.endTime.toISOString(),
          new: payload.booking.endTime.toISOString(),
        },
        rescheduledToUid: {
          old: null,
          new: payload.booking.uid,
        },
      };
      // Store audit against the ORIGINAL booking, with link to NEW booking
      await this.bookingAuditService.onBookingRescheduled(
        payload.oldBooking.uid,
        payload.booking.uid,
        actor,
        auditData
      );
    } catch (error) {
      this.log.error("Error while creating booking rescheduled audit", safeStringify(error));
    }
  }

  /**
   * Handles common tasks that need to be executed in both booking created and rescheduled events
   * A dedicated place because there are many tasks that need to be executed in both events.
   */
  private async onBookingCreatedOrRescheduled(payload: BookingCreatedPayload | BookingRescheduledPayload) {
    const results = await Promise.allSettled([
      // TODO: Migrate other post-booking tasks here, to execute them in parallel, without affecting each other
      this.updatePrivateLinkUsage(payload.bookingFormData.hashedLink),
    ]);
    results.forEach((result) => {
      if (result.status === "rejected") {
        this.log.error(
          "Error while executing onBookingCreatedOrRescheduled task",
          safeStringify(result.reason)
        );
      }
    });
  }

  private async updatePrivateLinkUsage(hashedLink: string | null) {
    try {
      if (hashedLink) {
        await this.deps.hashedLinkService.validateAndIncrementUsage(hashedLink);
      }
    } catch (error) {
      this.log.error("Error while updating hashed link", safeStringify(error));
    }
  }

  async onBookingAccepted(bookingUid: string, actor: Actor, data?: StatusChangeAuditData) {
    try {
      await this.bookingAuditService.onBookingAccepted(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating booking accepted audit", safeStringify(error));
    }
  }

  async onBookingCancelled(bookingUid: string, actor: Actor, data: CancelledAuditData) {
    try {
      await this.bookingAuditService.onBookingCancelled(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating booking cancelled audit", safeStringify(error));
    }
  }

  async onRescheduleRequested(bookingUid: string, actor: Actor, data: RescheduleRequestedAuditData) {
    try {
      await this.bookingAuditService.onRescheduleRequested(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating reschedule requested audit", safeStringify(error));
    }
  }

  async onAttendeeAdded(bookingUid: string, actor: Actor, data: AttendeeAddedAuditData) {
    try {
      await this.bookingAuditService.onAttendeeAdded(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating attendee added audit", safeStringify(error));
    }
  }

  async onHostNoShowUpdated(bookingUid: string, actor: Actor, data: HostNoShowUpdatedAuditData) {
    try {
      await this.bookingAuditService.onHostNoShowUpdated(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating host no-show audit", safeStringify(error));
    }
  }

  async onBookingRejected(bookingUid: string, actor: Actor, data: RejectedAuditData) {
    try {
      await this.bookingAuditService.onBookingRejected(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating booking rejected audit", safeStringify(error));
    }
  }

  private async onBookingStatusChange(
    bookingUid: string,
    actor: Actor,
    status: BookingStatus,
    data?: StatusChangeAuditData | CancelledAuditData | RejectedAuditData
  ) {
    try {
      // Route to the appropriate specific method based on status
      switch (status) {
        case "ACCEPTED": {
          // Type guard: ensure data is StatusChangeAuditData or undefined
          const statusData = isStatusChangeAuditData(data) ? data : undefined;
          await this.bookingAuditService.onBookingAccepted(bookingUid, actor, statusData);
          break;
        }
        case "REJECTED": {
          // Caller must provide RejectedAuditData for REJECTED status
          if (isRejectedAuditData(data)) {
            await this.bookingAuditService.onBookingRejected(bookingUid, actor, data);
          }
          break;
        }
        case "CANCELLED": {
          // Caller must provide CancelledAuditData for CANCELLED status
          if (isCancelledAuditData(data)) {
            await this.bookingAuditService.onBookingCancelled(bookingUid, actor, data);
          }
          break;
        }
      }
    } catch (error) {
      this.log.error(
        `Error while creating booking status change audit for status: ${status}`,
        safeStringify(error)
      );
    }
  }

  async onAttendeeRemoved(bookingUid: string, actor: Actor, data: AttendeeRemovedAuditData) {
    try {
      await this.bookingAuditService.onAttendeeRemoved(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating attendee removed audit", safeStringify(error));
    }
  }

  async onReassignment(bookingUid: string, actor: Actor, data: ReassignmentAuditData) {
    try {
      await this.bookingAuditService.onReassignment(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating reassignment audit", safeStringify(error));
    }
  }

  async onLocationChanged(bookingUid: string, actor: Actor, data: LocationChangedAuditData) {
    try {
      await this.bookingAuditService.onLocationChanged(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating location changed audit", safeStringify(error));
    }
  }

  async onAttendeeNoShowUpdated(bookingUid: string, actor: Actor, data: AttendeeNoShowUpdatedAuditData) {
    try {
      await this.bookingAuditService.onAttendeeNoShowUpdated(bookingUid, actor, data);
    } catch (error) {
      this.log.error("Error while creating attendee no-show audit", safeStringify(error));
    }
  }
}
