import type { BookingAuditProducerService } from "@calcom/features/booking-audit/lib/service/BookingAuditProducerService.interface";
import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { Actor } from "../types/actor";
import { IS_PRODUCTION } from "@calcom/lib/constants";

import type { BookingCreatedPayload, BookingRescheduledPayload } from "./types";

interface BookingEventHandlerDeps {
  log: ISimpleLogger;
  hashedLinkService: HashedLinkService;
  bookingAuditProducerService: BookingAuditProducerService;
}

export class BookingEventHandlerService {
  private readonly log: BookingEventHandlerDeps["log"];
  constructor(private readonly deps: BookingEventHandlerDeps) {
    this.log = deps.log;
  }

  async onBookingCreated(payload: BookingCreatedPayload, actor: Actor) {
    this.log.debug("onBookingCreated", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
    if (IS_PRODUCTION) {
      // Skip queueing audit for production environments till we are absolutely sure that the payload schema is correct for CREATED action
      // We might get more clarity as we implement more actions and test them
      return;
    }
    try {
      await this.deps.bookingAuditProducerService.queueAudit(payload.booking.uid, actor, payload.organizationId, {
        action: "CREATED",
        data: {
          startTime: payload.booking.startTime.getTime(),
          endTime: payload.booking.endTime.getTime(),
          status: payload.booking.status,
        },
      });
    } catch (error) {
      this.log.error("Error while queueing booking audit", safeStringify(error));
    }
  }

  async onBookingRescheduled(payload: BookingRescheduledPayload) {
    this.log.debug("onBookingRescheduled", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
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
}
