import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Booking, BookingCreated } from "@calcom/features/bookings/lib/bookingDomainEvents";
import * as getOrgIdUtils from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import * as getTeamIdUtils from "@calcom/lib/getTeamIdFromEventType";

import * as reminderScheduler from "../reminders/reminderScheduler";
import * as mandatoryReminder from "../reminders/scheduleMandatoryReminder";
import { workflowRepository } from "../repository/workflowRepository";
import type { Workflow } from "../types";
import { WorkflowBookingListener } from "./workflowBookingListener";

const baseBooking: Booking = {
  id: 1,
  user: { id: 123 },
  eventType: { id: 1, metadata: {}, owner: {}, teamId: 1 },
  calendarEvent: { attendeeSeatId: 456 },
  bookerUrl: "https://example.com",
  requiresConfirmation: false,
  isNotConfirmed: false,
};

const bookingCreated = (params?: Partial<Parameters<typeof BookingCreated>[0]>) =>
  new BookingCreated({ ...baseBooking, ...params });

const workflow = (id: number) => ({ id } as Workflow);

beforeEach(() => {
  vi.restoreAllMocks();

  vi.spyOn(getOrgIdUtils, "default").mockResolvedValue(null);
  vi.spyOn(getTeamIdUtils, "getTeamIdFromEventType").mockResolvedValue(baseBooking.eventType.teamId);

  vi.spyOn(workflowRepository, "getWorkflowsActiveOnEventType").mockResolvedValue([]);
  vi.spyOn(workflowRepository, "getTeamWorkflows").mockResolvedValue([]);
  vi.spyOn(workflowRepository, "getUserWorkflows").mockResolvedValue([]);
  vi.spyOn(workflowRepository, "getWorkflowsActiveOnTeam").mockResolvedValue([]);
  vi.spyOn(workflowRepository, "getWorkflowsActiveOnTeamMember").mockResolvedValue([]);

  vi.spyOn(reminderScheduler, "scheduleWorkflowReminders").mockResolvedValue();
  vi.spyOn(mandatoryReminder, "scheduleMandatoryReminder").mockResolvedValue();
});

describe("WorkflowBookingListener", () => {
  it("should correctly handle skipping and scheduling logic", async () => {
    const listener = new WorkflowBookingListener();

    await listener.onBookingCreated(bookingCreated({ isDryRun: true }));
    expect(mandatoryReminder.scheduleMandatoryReminder).not.toHaveBeenCalled();
    expect(reminderScheduler.scheduleWorkflowReminders).not.toHaveBeenCalled();

    await listener.onBookingCreated(
      bookingCreated({ eventType: { metadata: { disableStandardEmails: { all: { attendee: true } } } } })
    );
    expect(mandatoryReminder.scheduleMandatoryReminder).toHaveBeenCalledTimes(0);
    expect(reminderScheduler.scheduleWorkflowReminders).toHaveBeenCalledTimes(1);

    await listener.onBookingCreated(bookingCreated());
    expect(mandatoryReminder.scheduleMandatoryReminder).toHaveBeenCalledTimes(1);
    expect(reminderScheduler.scheduleWorkflowReminders).toHaveBeenCalledTimes(2);
  });

  it("should pass correct flags to mandatoryReminder", async () => {
    await new WorkflowBookingListener().onBookingCreated(
      bookingCreated({
        noEmail: true,
        platformClientId: 999,
        eventType: { owner: { hideBranding: true } },
        requiresConfirmation: true,
        calendarEvent: { attendeeSeatId: 789 },
      })
    );

    expect(mandatoryReminder.scheduleMandatoryReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        isPlatformNoEmail: true,
        hideBranding: true,
        requiresConfirmation: true,
        seatReferenceUid: 789,
      })
    );
  });

  it("should load workflows correctly based on eventType locking", async () => {
    const listener = new WorkflowBookingListener();

    // Managed And Locked
    vi.spyOn(getTeamIdUtils, "getTeamIdFromEventType").mockResolvedValue(1);
    await listener.onBookingCreated(bookingCreated({ eventType: { parentId: 2 } }));
    expect(workflowRepository.getUserWorkflows).not.toHaveBeenCalled();

    // Managed And unlocked
    await listener.onBookingCreated(
      bookingCreated({
        eventType: { parentId: 2, metadata: { managedEventConfig: { unlockedFields: { workflows: true } } } },
      })
    );
    expect(workflowRepository.getUserWorkflows).toHaveBeenCalledTimes(1);

    // Not managed
    await listener.onBookingCreated(bookingCreated());
    expect(workflowRepository.getUserWorkflows).toHaveBeenCalledTimes(2);

    vi.spyOn(getTeamIdUtils, "getTeamIdFromEventType").mockResolvedValue(null);
    await listener.onBookingCreated(bookingCreated({ eventType: { parentId: 2 } }));
    expect(workflowRepository.getUserWorkflows).toHaveBeenCalledTimes(3);

    vi.spyOn(workflowRepository, "getUserWorkflows").mockResolvedValue([workflow(111)]);
    await listener.onBookingCreated(bookingCreated());
    expect(workflowRepository.getUserWorkflows).toHaveBeenCalled();
    expect(reminderScheduler.scheduleWorkflowReminders).toHaveBeenCalledWith(
      expect.objectContaining({ workflows: [workflow(111)] })
    );
  });

  it("should load organization workflows if orgId exists", async () => {
    vi.spyOn(getOrgIdUtils, "default").mockResolvedValue(555);
    vi.spyOn(workflowRepository, "getTeamWorkflows").mockResolvedValue([workflow(222)]);

    await new WorkflowBookingListener().onBookingCreated(bookingCreated());

    expect(mandatoryReminder.scheduleMandatoryReminder).toHaveBeenCalledWith(
      expect.objectContaining({ workflows: [workflow(222)] })
    );
  });

  it("should pass isFirstRecurringEvent correctly", async () => {
    const listener = new WorkflowBookingListener();

    await listener.onBookingCreated(bookingCreated({ isRecurring: true, isFirstRecurringEvent: false }));
    expect(reminderScheduler.scheduleWorkflowReminders).toHaveBeenCalledWith(
      expect.objectContaining({ isFirstRecurringEvent: false })
    );

    await listener.onBookingCreated(bookingCreated({ isRecurring: true, isFirstRecurringEvent: true }));
    expect(reminderScheduler.scheduleWorkflowReminders).toHaveBeenCalledWith(
      expect.objectContaining({ isFirstRecurringEvent: true })
    );
  });

  it("should handle missing workflows gracefully", async () => {
    await new WorkflowBookingListener().onBookingCreated(bookingCreated());

    expect(mandatoryReminder.scheduleMandatoryReminder).toHaveBeenCalledWith(
      expect.objectContaining({ workflows: [] })
    );
    expect(reminderScheduler.scheduleWorkflowReminders).toHaveBeenCalledWith(
      expect.objectContaining({ workflows: [] })
    );
  });
});
