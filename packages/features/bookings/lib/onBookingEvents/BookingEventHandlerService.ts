import type { Logger } from "tslog";

import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { BookingCreatedPayload, BookingRescheduledPayload } from "./types";

interface BookingEventHandlerDeps {
  log: Logger<unknown>;
  hashedLinkService: HashedLinkService;
}

export class BookingEventHandlerService {
  private readonly log: BookingEventHandlerDeps["log"];
  private readonly hashedLinkService: BookingEventHandlerDeps["hashedLinkService"];

  constructor(private readonly deps: BookingEventHandlerDeps) {
    this.log = deps.log;
    this.hashedLinkService = deps.hashedLinkService;
  }

  async onBookingCreated(payload: BookingCreatedPayload) {
    this.log.debug("onBookingCreated", safeStringify(payload));
    if (payload.config.isDryRun) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
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
