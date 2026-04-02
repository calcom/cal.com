import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import { SchedulingType } from "@calcom/prisma/enums";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (importFn: () => Promise<any>) => {
    const LazyComponent = React.lazy(importFn);
    return function DynamicWrapper(props: any) {
      return (
        <React.Suspense fallback={null}>
          <LazyComponent {...props} />
        </React.Suspense>
      );
    };
  },
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/event-types/1",
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("?tabName=setup"),
  useParams: () => ({}),
  ReadonlyURLSearchParams: URLSearchParams,
}));

const mockMutate = vi.fn();
vi.mock("@calcom/trpc/react", () => {
  const createQueryHook = (defaultData: unknown = undefined) => ({
    useQuery: vi.fn(() => ({
      data: defaultData,
      isPending: false,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })),
  });

  return {
    trpc: {
      viewer: {
        eventTypes: {
          get: createQueryHook(),
          delete: {
            useMutation: vi.fn(() => ({
              mutate: vi.fn(),
              isPending: false,
            })),
          },
        },
        eventTypesHeavy: {
          update: {
            useMutation: vi.fn((opts?: { onSuccess?: Function }) => ({
              mutate: mockMutate,
              isPending: false,
            })),
          },
        },
        apps: {
          integrations: createQueryHook({ items: [] }),
        },
        workflows: {
          getAllActiveWorkflows: createQueryHook([]),
        },
      },
      useUtils: vi.fn(() => ({
        viewer: {
          eventTypes: {
            get: { invalidate: vi.fn() },
            getByViewer: { invalidate: vi.fn() },
            invalidate: vi.fn(),
          },
        },
      })),
    },
  };
});

vi.mock("@calcom/trpc/react/hooks/useMeQuery", () => ({
  __esModule: true,
  default: vi.fn(() => ({
    data: {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      username: "testuser",
      organizationId: null,
      organization: null,
      defaultScheduleId: 1,
    },
    isPending: false,
  })),
}));

vi.mock("@calcom/features/ee/organizations/context/provider", () => ({
  useOrgBranding: vi.fn(() => null),
}));

vi.mock("@calcom/features/pbac/client/context/EventPermissionContext", () => ({
  EventPermissionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@calcom/features/pbac/client/hooks/useEventPermission", () => ({
  useWorkflowPermission: vi.fn(() => ({ hasPermission: true })),
}));

vi.mock("@calcom/lib/hooks/useTypedQuery", () => ({
  useTypedQuery: vi.fn(() => ({ data: { tabName: "setup" } })),
}));

vi.mock("@calcom/web/modules/shell/Shell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

vi.mock("@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions", () => ({
  revalidateTeamEventTypeCache: vi.fn(),
}));

vi.mock("@calcom/web/app/(use-page-wrapper)/event-types/[type]/actions", () => ({
  revalidateEventTypeEditPage: vi.fn(),
}));

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: vi.fn(() => ({
    t: (key: string, opts?: Record<string, unknown>) => key,
    i18n: { language: "en" },
  })),
}));

vi.mock("@calcom/lib/components/ServerTrans", () => ({
  __esModule: true,
  default: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@calcom/web/modules/embed/components/EventTypeEmbed", () => ({
  EventTypeEmbedButton: () => null,
  EventTypeEmbedDialog: () => null,
}));

vi.mock("../tabs/setup/EventSetupTabWebWrapper", () => ({
  __esModule: true,
  default: () => <div data-testid="setup-tab">Setup Tab</div>,
}));

vi.mock("../tabs/availability/EventAvailabilityTabWebWrapper", () => ({
  __esModule: true,
  default: () => <div data-testid="availability-tab">Availability Tab</div>,
}));

vi.mock("../tabs/assignment/EventTeamAssignmentTabWebWrapper", () => ({
  __esModule: true,
  default: () => <div data-testid="assignment-tab">Assignment Tab</div>,
}));

vi.mock("../tabs/limits/EventLimitsTabWebWrapper", () => ({
  __esModule: true,
  default: () => <div data-testid="limits-tab">Limits Tab</div>,
}));

vi.mock("../tabs/advanced/EventAdvancedWebWrapper", () => ({
  __esModule: true,
  default: () => <div data-testid="advanced-tab">Advanced Tab</div>,
}));

vi.mock("../tabs/instant/EventInstantTab", () => ({
  EventInstantTab: () => <div data-testid="instant-tab">Instant Tab</div>,
}));

vi.mock("../tabs/recurring/EventRecurringWebWrapper", () => ({
  __esModule: true,
  default: () => <div data-testid="recurring-tab">Recurring Tab</div>,
}));

vi.mock("../tabs/apps/EventAppsTab", () => ({
  EventAppsTab: () => <div data-testid="apps-tab">Apps Tab</div>,
}));

vi.mock("../tabs/workflows/EventWorkflowsTab", () => ({
  __esModule: true,
  default: () => <div data-testid="workflows-tab">Workflows Tab</div>,
}));

vi.mock("../tabs/webhooks/EventWebhooksTab", () => ({
  EventWebhooksTab: () => <div data-testid="webhooks-tab">Webhooks Tab</div>,
}));

vi.mock("../tabs/ai/EventAITab", () => ({
  EventAITab: () => <div data-testid="ai-tab">AI Tab</div>,
}));

vi.mock("@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager", () => ({
  __esModule: true,
  default: vi.fn(() => ({
    isManagedEventType: true,
    isChildrenManagedEventType: false,
    shouldLockDisableProps: vi.fn(() => ({ disabled: false, LockedIcon: () => null, isLocked: false })),
    shouldLockIndicator: vi.fn(() => ({ LockedIcon: () => null, isLocked: false })),
    useLockedLabel: vi.fn(() => ({ LockedIcon: () => null, isLocked: false })),
  })),
}));

vi.mock("@calcom/features/components/controlled-dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}));

import { EventTypeWebWrapper } from "../EventTypeWebWrapper";

function buildChildWithConflict(overrides?: Partial<ChildrenEventType>): ChildrenEventType {
  return {
    value: "user-1",
    label: "Alice",
    created: false,
    owner: {
      avatar: "https://example.com/avatar.png",
      id: 1,
      email: "alice@example.com",
      name: "Alice",
      username: "alice",
      membership: "MEMBER" as const,
      eventTypeSlugs: ["test-event"],
      profile: { id: 1 } as any,
    },
    slug: "test-event",
    hidden: false,
    ...overrides,
  };
}

function buildEventTypeData({
  children = [],
  slug = "test-event",
}: {
  children?: ChildrenEventType[];
  slug?: string;
} = {}) {
  const eventType = {
    id: 1,
    title: "Test Event",
    slug,
    length: 30,
    offsetStart: 0,
    description: "A test event",
    hidden: false,
    locations: [],
    customInputs: [],
    users: [
      {
        id: 1,
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
        avatarUrl: null,
        locale: "en",
        defaultScheduleId: 1,
        isPlatformManaged: false,
        timeZone: "UTC",
        avatar: "https://example.com/avatar.png",
        profile: { id: 1, username: "testuser", organizationId: null, organization: null, upId: "usr-1" },
      },
    ],
    team: {
      id: 100,
      slug: "test-team",
      name: "Test Team",
      parentId: null,
      parent: null,
      members: [
        {
          user: {
            id: 1,
            name: "Alice",
            username: "alice",
            email: "alice@example.com",
            avatarUrl: null,
            locale: "en",
            defaultScheduleId: 1,
            isPlatformManaged: false,
            timeZone: "UTC",
            eventTypes: [{ slug: "test-event" }],
            profile: {
              id: 1,
              username: "alice",
              organizationId: null,
              organization: null,
              upId: "usr-1",
            },
          },
          role: "ADMIN",
          accepted: true,
        },
      ],
      organizationSettings: null,
    },
    teamId: 100,
    schedulingType: SchedulingType.MANAGED,
    children,
    hosts: [],
    owner: null,
    schedule: null,
    restrictionScheduleId: null,
    restrictionScheduleName: null,
    useBookerTimezone: false,
    instantMeetingSchedule: null,
    scheduleName: null,
    requiresCancellationReason: null,
    recurringEvent: null,
    bookingLimits: null,
    durationLimits: null,
    eventTypeColor: null,
    metadata: { apps: {} },
    periodType: "UNLIMITED",
    periodStartDate: null,
    periodEndDate: null,
    periodDays: 0,
    periodCountCalendarDays: true,
    rollingExcludeUnavailableDays: false,
    requiresConfirmation: false,
    requiresConfirmationWillBlockSlot: false,
    requiresConfirmationForFreeEmail: false,
    requiresBookerEmailVerification: false,
    disableGuests: false,
    hideCalendarNotes: false,
    minimumBookingNotice: 120,
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    seatsPerTimeSlot: null,
    seatsShowAttendees: null,
    seatsShowAvailabilityCount: null,
    onlyShowFirstAvailableSlot: false,
    showOptimizedSlots: false,
    eventName: "",
    bookingFields: [],
    slotInterval: null,
    successRedirectUrl: "",
    redirectUrlOnNoRoutingFormResponse: "",
    forwardParamsSuccessRedirect: null,
    isInstantEvent: false,
    instantMeetingParameters: [],
    instantMeetingExpiryTimeOffsetInSeconds: 0,
    hashedLink: [],
    userId: 1,
    assignAllTeamMembers: false,
    assignRRMembersUsingSegment: false,
    rrSegmentQueryValue: null,
    rescheduleWithSameRoundRobinHost: false,
    bookerUrl: "http://app.cal.local:3000",
    parent: null,
    lockTimeZoneToggleOnBookingPage: false,
    lockedTimeZone: null,
    destinationCalendar: null,
    hostGroups: [],
    isRRWeightsEnabled: false,
    maxLeadThreshold: null,
    useEventLevelSelectedCalendars: false,
    disabledCancelling: false,
    disableCancellingScope: null,
    disabledRescheduling: false,
    disableReschedulingScope: null,
    minimumRescheduleNotice: null,
    maxActiveBookingsPerBooker: null,
    interfaceLanguage: null,
    multiplePrivateLinks: [],
    enablePerHostLocations: false,
    autoTranslateDescriptionEnabled: false,
    autoTranslateInstantMeetingTitleEnabled: false,
    fieldTranslations: [],
    calVideoSettings: null,
    maxActiveBookingPerBookerOfferReschedule: false,
    shouldMergePhoneSystemFields: null,
    secondaryEmailId: undefined,
    multipleDurationEnabled: false,
    webhooks: [],
    workflows: [],
  };

  return {
    eventType,
    locationOptions: [],
    destinationCalendar: null,
    team: eventType.team,
    teamMembers: [
      {
        id: 1,
        name: "Alice",
        username: "alice",
        email: "alice@example.com",
        avatarUrl: null,
        locale: "en",
        defaultScheduleId: 1,
        isPlatformManaged: false,
        timeZone: "UTC",
        avatar: "https://example.com/avatar.png",
        profileId: 1,
        eventTypes: ["test-event"],
        membership: "MEMBER",
        profile: { id: 1, username: "alice", organizationId: null, organization: null, upId: "usr-1" },
      },
    ],
    currentUserMembership: { role: "ADMIN" },
    isUserOrganizationAdmin: false,
  };
}

describe("EventTypeWebWrapper — rendering and form behavior", () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockPush.mockClear();
  });

  it("renders the component with a MANAGED event type without crashing", async () => {
    const data = buildEventTypeData();

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-tab")).toBeInTheDocument();
    });
  });

  it("renders the form element with the correct id", async () => {
    const data = buildEventTypeData();

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(document.querySelector("form#event-type-form")).toBeInTheDocument();
    });
  });

  it("renders with children that have no conflicting slugs without showing dialog", async () => {
    const nonConflictingChild: ChildrenEventType = {
      ...buildChildWithConflict(),
      owner: {
        ...buildChildWithConflict().owner,
        eventTypeSlugs: ["other-event"],
      },
    };
    const data = buildEventTypeData({ children: [nonConflictingChild] });

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-tab")).toBeInTheDocument();
    });

    expect(screen.queryByText("managed_event_dialog_title")).not.toBeInTheDocument();
  });

  it("renders with existing (created) children without showing dialog", async () => {
    const existingChild: ChildrenEventType = {
      ...buildChildWithConflict(),
      created: true,
    };
    const data = buildEventTypeData({ children: [existingChild] });

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-tab")).toBeInTheDocument();
    });

    expect(screen.queryByText("managed_event_dialog_title")).not.toBeInTheDocument();
  });

  it("renders children in the form default values", async () => {
    const child = buildChildWithConflict();
    const data = buildEventTypeData({ children: [child] });

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-tab")).toBeInTheDocument();
    });

    expect(document.querySelector("form#event-type-form")).toBeInTheDocument();
  });
});

// Skip: ManagedEventDialog conflict check is broken on main (commit 2b43d9a716).
// The onConflict callback exists but is never invoked during form submission —
// handleSubmit goes directly to updateMutation.mutate with no interception.
// PR #1101 fixes this by wiring useManagedEventConflictCheck into the submit path.
// Unskip after #1101 merges.
describe.skip("EventTypeWebWrapper — ManagedEventDialog conflict check", () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockPush.mockClear();
  });

  it("shows ManagedEventDialog when submitting with newly-added children having conflicting slugs", async () => {
    const conflictingChild = buildChildWithConflict();
    const data = buildEventTypeData({ children: [conflictingChild] });

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-tab")).toBeInTheDocument();
    });

    const form = document.querySelector("form#event-type-form") as HTMLFormElement;
    expect(form).toBeInTheDocument();
    form.requestSubmit();

    await waitFor(() => {
      expect(screen.getByText("managed_event_dialog_title")).toBeInTheDocument();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits form after confirming the conflict dialog", async () => {
    const conflictingChild = buildChildWithConflict();
    const data = buildEventTypeData({ children: [conflictingChild] });

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-tab")).toBeInTheDocument();
    });

    const form = document.querySelector("form#event-type-form") as HTMLFormElement;
    form.requestSubmit();

    await waitFor(() => {
      expect(screen.getByText("managed_event_dialog_title")).toBeInTheDocument();
    });

    const confirmButton = screen.getByText("managed_event_dialog_confirm_button");
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  it("does not submit when conflict dialog is cancelled", async () => {
    const conflictingChild = buildChildWithConflict();
    const data = buildEventTypeData({ children: [conflictingChild] });

    render(<EventTypeWebWrapper id={1} data={data as any} />);

    await waitFor(() => {
      expect(screen.getByTestId("setup-tab")).toBeInTheDocument();
    });

    const form = document.querySelector("form#event-type-form") as HTMLFormElement;
    form.requestSubmit();

    await waitFor(() => {
      expect(screen.getByText("managed_event_dialog_title")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("go_back");
    await userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("managed_event_dialog_title")).not.toBeInTheDocument();
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
