import type { Logger } from "tslog";

import type { HashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { BookingCreatedPayload, BookingRescheduledPayload } from "./types";

interface BookingEventHandlerDeps {
  log: Logger<unknown>;
  hashedLinkService: HashedLinkService;
}

export class BookingEventHandlerService {
  constructor(private readonly deps: BookingEventHandlerDeps) {}

  async onBookingCreated(payload: BookingCreatedPayload) {
    if (!this.shouldProcess(payload)) {
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
  }

  async onBookingRescheduled(payload: BookingRescheduledPayload) {
    if (!this.shouldProcess(payload)) {
      throw new Error("Not implemented");
      return;
    }
    await this.onBookingCreatedOrRescheduled(payload);
  }

  private async onBookingCreatedOrRescheduled(payload: BookingCreatedPayload | BookingRescheduledPayload) {
    const results = await Promise.allSettled([
      // TODO: Add other post-booking tasks here, to execute them in parallel, without affecting each other
      this.updatePrivateLinkUsage(payload),
    ]);
    results.forEach((result) => {
      if (result.status === "rejected") {
        this.deps.log.error(
          "Error while executing onBookingCreatedOrRescheduled task",
          safeStringify(result.reason)
        );
      }
    });
  }

  private async updatePrivateLinkUsage(payload: BookingCreatedPayload | BookingRescheduledPayload) {
    try {
      if (payload.bookingFormData.hashedLink) {
        await this.deps.hashedLinkService.validateAndIncrementUsage(payload.bookingFormData.hashedLink);
      }
    } catch (error) {
      this.deps.log.error("Error while updating hashed link", safeStringify(error));
    }
  }

  private shouldProcess(payload: BookingCreatedPayload | BookingRescheduledPayload) {
    return !payload.config.isDryRun;
  }
}
