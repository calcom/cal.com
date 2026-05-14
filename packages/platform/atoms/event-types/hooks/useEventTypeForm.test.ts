/**
 * @vitest-environment jsdom
 */
import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import { stripChildrenForPayload } from "@calcom/features/eventtypes/lib/childrenEventType";
import type { EventTypeUpdateInput } from "@calcom/features/eventtypes/lib/types";
import { CancellationReasonRequirement, MembershipRole, PeriodType } from "@calcom/prisma/enums";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEventTypeForm } from "./useEventTypeForm";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

type HookEventType = Parameters<typeof useEventTypeForm>[0]["eventType"];

const createEventType = (overrides: Partial<HookEventType> = {}): HookEventType =>
  ({
    id: 1,
    title: "Test Event",
    slug: "test-event",
    afterEventBuffer: 0,
    beforeEventBuffer: 0,
    eventName: "",
    scheduleName: null,
    periodDays: null,
    requiresBookerEmailVerification: false,
    seatsPerTimeSlot: null,
    seatsShowAttendees: false,
    seatsShowAvailabilityCount: true,
    lockTimeZoneToggleOnBookingPage: false,
    lockedTimeZone: null,
    locations: [],
    destinationCalendar: null,
    recurringEvent: null,
    isInstantEvent: false,
    instantMeetingParameters: [],
    instantMeetingExpiryTimeOffsetInSeconds: 90,
    description: null,
    schedule: null,
    instantMeetingSchedule: null,
    bookingLimits: null,
    onlyShowFirstAvailableSlot: false,
    durationLimits: null,
    length: 30,
    hidden: false,
    hashedLink: [],
    eventTypeColor: null,
    periodStartDate: null,
    periodEndDate: null,
    hideCalendarNotes: false,
    hideCalendarEventDetails: false,
    offsetStart: 0,
    bookingFields: [],
    periodType: PeriodType.UNLIMITED,
    periodCountCalendarDays: false,
    schedulingType: null,
    requiresConfirmation: false,
    canSendCalVideoTranscriptionEmails: true,
    requiresConfirmationWillBlockSlot: false,
    requiresConfirmationForFreeEmail: false,
    slotInterval: null,
    minimumBookingNotice: 120,
    minimumRescheduleNotice: null,
    disableCancelling: false,
    disableRescheduling: false,
    requiresCancellationReason: null,
    allowReschedulingPastBookings: false,
    hideOrganizerEmail: false,
    metadata: {},
    hosts: [],
    hostGroups: [],
    successRedirectUrl: null,
    forwardParamsSuccessRedirect: true,
    users: [],
    useEventTypeDestinationCalendarEmail: false,
    secondaryEmailId: null,
    children: [],
    autoTranslateDescriptionEnabled: false,
    autoTranslateInstantMeetingTitleEnabled: true,
    rescheduleWithSameRoundRobinHost: false,
    assignAllTeamMembers: false,
    assignRRMembersUsingSegment: false,
    rrSegmentQueryValue: null,
    isRRWeightsEnabled: false,
    maxLeadThreshold: null,
    includeNoShowInRRCalculation: false,
    useEventLevelSelectedCalendars: false,
    customReplyToEmail: null,
    calVideoSettings: null,
    maxActiveBookingsPerBooker: null,
    maxActiveBookingPerBookerOfferReschedule: false,
    showOptimizedSlots: false,
    enablePerHostLocations: false,
    team: null,
    teamId: null,
    owner: null,
    parent: null,
    fieldTranslations: [],
    restrictionScheduleId: null,
    restrictionScheduleName: null,
    useBookerTimezone: false,
    currency: "usd",
    price: 0,
    webhooks: [],
    customInputs: [],
    ...overrides,
  }) as HookEventType;

afterEach(() => {
  cleanup();
});

describe("useEventTypeForm - cancellation reason requirement", () => {
  it("should hydrate the saved cancellation reason requirement", () => {
    const { result } = renderHook(() =>
      useEventTypeForm({
        eventType: createEventType({
          requiresCancellationReason: CancellationReasonRequirement.MANDATORY_ATTENDEE_ONLY,
        }),
        onSubmit: vi.fn(),
      })
    );

    expect(result.current.form.getValues("requiresCancellationReason")).toBe(
      CancellationReasonRequirement.MANDATORY_ATTENDEE_ONLY
    );
  });

  it("should use the legacy host-only default when the saved value is null", () => {
    const { result } = renderHook(() =>
      useEventTypeForm({
        eventType: createEventType({ requiresCancellationReason: null }),
        onSubmit: vi.fn(),
      })
    );

    expect(result.current.form.getValues("requiresCancellationReason")).toBe(
      CancellationReasonRequirement.MANDATORY_HOST_ONLY
    );
  });

  it("should submit the selected cancellation reason requirement when changed", async () => {
    const onSubmit = vi.fn((_data: EventTypeUpdateInput) => undefined);
    const { result } = renderHook(() =>
      useEventTypeForm({
        eventType: createEventType(),
        onSubmit,
      })
    );

    act(() => {
      result.current.form.setValue(
        "requiresCancellationReason",
        CancellationReasonRequirement.OPTIONAL_BOTH,
        { shouldDirty: true }
      );
    });

    await waitFor(() => expect(result.current.form.formState.isDirty).toBe(true));

    await act(async () => {
      await result.current.handleSubmit(result.current.form.getValues());
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        requiresCancellationReason: CancellationReasonRequirement.OPTIONAL_BOTH,
      })
    );
  });
});

describe("useEventTypeForm - children payload stripping", () => {
  it("should strip avatar, profile, username, and membership from children payload", () => {
    const children: ChildrenEventType[] = [
      {
        value: "1",
        label: "Alice",
        created: true,
        slug: "test-event",
        hidden: false,
        owner: {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          username: "alice",
          avatar: "data:image/png;base64," + "A".repeat(50000), // Large base64 avatar
          membership: MembershipRole.MEMBER,
          eventTypeSlugs: ["meeting", "consultation"],
          profile: {
            id: 1,
            username: "alice",
            upId: "usr_1",
            organizationId: null,
            organization: null,
          },
        },
      },
      {
        value: "2",
        label: "Bob",
        created: false,
        slug: "test-event",
        hidden: true,
        owner: {
          id: 2,
          name: "Bob",
          email: "bob@example.com",
          username: "bob",
          avatar: "https://example.com/avatars/bob.png",
          membership: MembershipRole.OWNER,
          eventTypeSlugs: [],
          profile: {
            id: 2,
            username: "bob",
            upId: "usr_2",
            organizationId: 10,
            organization: {
              id: 10,
              slug: "org",
              name: "Org",
              calVideoLogo: null,
              bannerUrl: "",
              isPlatform: false,
            },
          },
        },
      },
    ];

    const stripped = stripChildrenForPayload(children);

    // Should only contain server-needed fields
    expect(stripped).toEqual([
      {
        hidden: false,
        owner: {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          eventTypeSlugs: ["meeting", "consultation"],
        },
      },
      {
        hidden: true,
        owner: {
          id: 2,
          name: "Bob",
          email: "bob@example.com",
          eventTypeSlugs: [],
        },
      },
    ]);

    // Verify avatar is not present
    for (const child of stripped) {
      expect(child.owner).not.toHaveProperty("avatar");
      expect(child.owner).not.toHaveProperty("profile");
      expect(child.owner).not.toHaveProperty("username");
      expect(child.owner).not.toHaveProperty("membership");
    }
  });

  it("should significantly reduce payload size for large teams", () => {
    // Simulate 85 users with base64 avatars (~10KB each)
    const largeBase64Avatar = "data:image/png;base64," + "A".repeat(10000);

    const children: ChildrenEventType[] = Array.from({ length: 85 }, (_, i) => ({
      value: String(i + 1),
      label: `User ${i + 1}`,
      created: true,
      slug: "managed-event",
      hidden: false,
      owner: {
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        username: `user${i + 1}`,
        avatar: largeBase64Avatar,
        membership: MembershipRole.MEMBER,
        eventTypeSlugs: ["event-a", "event-b"],
        profile: {
          id: i + 1,
          username: `user${i + 1}`,
          upId: `usr_${i + 1}`,
          organizationId: 1,
          organization: {
            id: 1,
            slug: "org",
            name: "Large Org",
            calVideoLogo: null,
            bannerUrl: "",
            isPlatform: false,
          },
        },
      },
    }));

    const fullPayloadSize = JSON.stringify(children).length;
    const strippedPayloadSize = JSON.stringify(stripChildrenForPayload(children)).length;

    // The stripped payload should be dramatically smaller
    expect(strippedPayloadSize).toBeLessThan(fullPayloadSize * 0.1);

    // Full payload with 85 users and 10KB avatars should be around 850KB+
    expect(fullPayloadSize).toBeGreaterThan(800000);

    // Stripped payload should be well under 1MB
    expect(strippedPayloadSize).toBeLessThan(100000);
  });

  it("should handle undefined children gracefully", () => {
    const children: ChildrenEventType[] = [];
    const stripped = stripChildrenForPayload(children);
    expect(stripped).toEqual([]);
  });
});
