import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { RRTimestampBasis, SchedulingType } from "@calcom/prisma/enums";

import type { EventTeamAssignmentTabBaseProps } from "../EventTeamAssignmentTab";
import { EventTeamAssignmentTab } from "../EventTeamAssignmentTab";

// --- Mocks ---

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

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content?: React.ReactNode }) => (
    <>
      {content && <span>{content}</span>}
      {children}
    </>
  ),
}));

vi.mock("@calcom/web/modules/event-types/components/AddMembersWithSwitch", () => ({
  mapUserToValue: vi.fn((member: { id: number; name: string; email: string }) => ({
    value: `${member.id}`,
    label: member.name || member.email,
    avatar: "",
    email: member.email,
    defaultScheduleId: null,
  })),
}));

const HostsMock = vi.fn((_props: Record<string, unknown>) => <div data-testid="hosts" />);
vi.mock("../Hosts", () => ({
  Hosts: (props: Record<string, unknown>) => HostsMock(props),
}));

const ChildrenEventTypesMock = vi.fn((_props: Record<string, unknown>) => <div data-testid="children-event-types" />);
vi.mock("../ChildrenEventTypes", () => ({
  ChildrenEventTypes: (props: Record<string, unknown>) => ChildrenEventTypesMock(props),
}));

const WarningDialogMock = vi.fn((_props: Record<string, unknown>) => <div data-testid="warning-dialog" />);
vi.mock("@calcom/web/modules/event-types/components/dialogs/assign-all-managed-warning-dialog", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => WarningDialogMock(props),
}));

// --- Restore mocks before each test (test-setup's afterEach resets implementations) ---

import { beforeEach } from "vitest";
import { mapUserToValue } from "@calcom/web/modules/event-types/components/AddMembersWithSwitch";

beforeEach(() => {
  // Clear accumulated call history — vi.resetAllMocks() from test-setup.ts
  // does not reliably clear calls on standalone vi.fn() variables defined in the test file.
  HostsMock.mockClear();
  ChildrenEventTypesMock.mockClear();
  WarningDialogMock.mockClear();
  vi.mocked(mapUserToValue).mockClear();

  HostsMock.mockImplementation(() => <div data-testid="hosts" />);
  ChildrenEventTypesMock.mockImplementation(() => <div data-testid="children-event-types" />);
  WarningDialogMock.mockImplementation(() => <div data-testid="warning-dialog" />);
  vi.mocked(mapUserToValue).mockImplementation(
    (member: any) => ({
      value: `${member.id}`,
      label: member.name || member.email,
      avatar: "",
      email: member.email,
      defaultScheduleId: null,
    })
  );
});

// --- Test Data Builders ---

function buildTeamMember(
  overrides: Partial<EventTeamAssignmentTabBaseProps["teamMembers"][number]> & { id: number }
): EventTeamAssignmentTabBaseProps["teamMembers"][number] {
  return {
    name: `Member ${overrides.id}`,
    email: `member-${overrides.id}@test.com`,
    username: `member-${overrides.id}`,
    membership: "MEMBER" as const,
    eventTypes: [],
    avatar: `avatar-${overrides.id}.png`,
    profile: { id: overrides.id } as any,
    ...overrides,
  } as any;
}

function buildTeam(
  overrides?: Partial<NonNullable<EventTeamAssignmentTabBaseProps["team"]>>
): EventTeamAssignmentTabBaseProps["team"] {
  return {
    id: 100,
    parentId: null,
    rrTimestampBasis: RRTimestampBasis.CREATED_AT,
    ...overrides,
  } as EventTeamAssignmentTabBaseProps["team"];
}

function buildEventType(
  overrides?: Partial<EventTeamAssignmentTabBaseProps["eventType"]>
): EventTeamAssignmentTabBaseProps["eventType"] {
  return {
    slug: "test-event",
    children: [],
    schedulingType: SchedulingType.COLLECTIVE,
    team: buildTeam(),
    ...overrides,
  } as EventTeamAssignmentTabBaseProps["eventType"];
}

function buildFormValues(overrides?: Partial<FormValues>): Partial<FormValues> {
  return {
    schedulingType: SchedulingType.COLLECTIVE,
    assignAllTeamMembers: false,
    children: [],
    hosts: [],
    hostGroups: [],
    slug: "test-event",
    assignRRMembersUsingSegment: false,
    maxLeadThreshold: null as unknown as number,
    ...overrides,
  };
}

const defaultTeamMembers = [
  buildTeamMember({ id: 1, name: "Alice", eventTypes: ["test-event"] }),
  buildTeamMember({ id: 2, name: "Bob" }),
];

// --- Helpers ---

function getHostsMockCallProp(prop: string) {
  return (HostsMock.mock.calls[0]?.[0] as Record<string, unknown>)?.[prop];
}

function getChildrenMockCallProp(prop: string) {
  return (ChildrenEventTypesMock.mock.calls[0]?.[0] as Record<string, unknown>)?.[prop];
}

function Wrapper({
  children,
  formDefaults,
}: {
  children: React.ReactNode;
  formDefaults?: Partial<FormValues>;
}) {
  const methods = useForm<FormValues>({
    defaultValues: buildFormValues(formDefaults) as FormValues,
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

function renderTab({
  eventType,
  team,
  teamMembers = defaultTeamMembers,
  formDefaults,
  schedulingType,
}: {
  eventType?: EventTeamAssignmentTabBaseProps["eventType"];
  team?: EventTeamAssignmentTabBaseProps["team"] | null;
  teamMembers?: EventTeamAssignmentTabBaseProps["teamMembers"];
  formDefaults?: Partial<FormValues>;
  schedulingType?: SchedulingType;
} = {}) {
  const resolvedTeam = team === null ? undefined : (team ?? buildTeam());
  const resolvedSchedulingType = schedulingType ?? eventType?.schedulingType ?? SchedulingType.COLLECTIVE;
  const resolvedEventType = eventType
    ? ({ ...eventType, schedulingType: resolvedSchedulingType } as EventTeamAssignmentTabBaseProps["eventType"])
    : buildEventType({ schedulingType: resolvedSchedulingType });

  return render(
    <Wrapper
      formDefaults={buildFormValues({
        schedulingType: resolvedSchedulingType,
        ...formDefaults,
      })}>
      <EventTeamAssignmentTab
        team={resolvedTeam as any}
        teamMembers={teamMembers}
        eventType={resolvedEventType}
        orgId={null}
        isSegmentApplicable={false}
      />
    </Wrapper>
  );
}

// --- Tests ---

describe("EventTeamAssignmentTab", () => {
  describe("non-managed scheduling types", () => {
    it("renders scheduling type selector and Hosts for COLLECTIVE", () => {
      renderTab({ schedulingType: SchedulingType.COLLECTIVE });

      expect(screen.getByText("assignment")).toBeInTheDocument();
      expect(screen.getByText("scheduling_type")).toBeInTheDocument();
      expect(screen.getByTestId("hosts")).toBeInTheDocument();
      expect(screen.queryByTestId("children-event-types")).not.toBeInTheDocument();
    });

    it("renders scheduling type selector and Hosts for ROUND_ROBIN", () => {
      renderTab({ schedulingType: SchedulingType.ROUND_ROBIN });

      expect(screen.getByText("scheduling_type")).toBeInTheDocument();
      expect(screen.getByTestId("hosts")).toBeInTheDocument();
      expect(screen.queryByTestId("children-event-types")).not.toBeInTheDocument();
    });

    it("renders round-robin distribution options for ROUND_ROBIN", () => {
      renderTab({ schedulingType: SchedulingType.ROUND_ROBIN });

      expect(screen.getByText("rr_distribution_method")).toBeInTheDocument();
      expect(screen.getByText("rr_distribution_method_availability_title")).toBeInTheDocument();
      expect(screen.getByText("rr_distribution_method_balanced_title")).toBeInTheDocument();
    });

    it("renders includeNoShowInRRCalculation toggle for ROUND_ROBIN", () => {
      renderTab({ schedulingType: SchedulingType.ROUND_ROBIN });

      expect(screen.getByText("include_no_show_in_rr_calculation")).toBeInTheDocument();
    });

    it("disables load balancing when rrTimestampBasis is not CREATED_AT", () => {
      renderTab({
        schedulingType: SchedulingType.ROUND_ROBIN,
        eventType: buildEventType({
          team: buildTeam({ rrTimestampBasis: RRTimestampBasis.START_TIME }),
        }),
      });

      expect(screen.getByText("rr_load_balancing_disabled")).toBeInTheDocument();
    });

    it("disables load balancing when multiple host groups exist", () => {
      renderTab({
        schedulingType: SchedulingType.ROUND_ROBIN,
        formDefaults: {
          hostGroups: [
            { id: "g1", name: "Group 1" },
            { id: "g2", name: "Group 2" },
          ],
        },
      });

      expect(screen.getByText("rr_load_balancing_disabled_with_groups")).toBeInTheDocument();
    });

    it("does not render round-robin distribution options for COLLECTIVE", () => {
      renderTab({ schedulingType: SchedulingType.COLLECTIVE });

      expect(screen.queryByText("rr_distribution_method")).not.toBeInTheDocument();
    });

    it("does not render ChildrenEventTypes or warning dialog for non-managed types", () => {
      renderTab({ schedulingType: SchedulingType.ROUND_ROBIN });

      expect(screen.queryByTestId("children-event-types")).not.toBeInTheDocument();
      expect(screen.queryByTestId("warning-dialog")).not.toBeInTheDocument();
    });
  });

  describe("managed scheduling type", () => {
    it("renders ChildrenEventTypes and warning dialog for MANAGED", async () => {
      renderTab({ schedulingType: SchedulingType.MANAGED });

      expect(screen.getByTestId("children-event-types")).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId("warning-dialog")).toBeInTheDocument();
      });
    });

    it("does not render scheduling type selector or Hosts for MANAGED", () => {
      renderTab({ schedulingType: SchedulingType.MANAGED });

      expect(screen.queryByText("scheduling_type")).not.toBeInTheDocument();
      expect(screen.queryByTestId("hosts")).not.toBeInTheDocument();
    });
  });

  describe("no team", () => {
    it("renders nothing when team is absent", () => {
      renderTab({ team: null });

      expect(screen.queryByText("scheduling_type")).not.toBeInTheDocument();
      expect(screen.queryByTestId("hosts")).not.toBeInTheDocument();
      expect(screen.queryByTestId("children-event-types")).not.toBeInTheDocument();
      expect(screen.queryByTestId("warning-dialog")).not.toBeInTheDocument();
    });
  });

  describe("team member filtering", () => {
    it("filters out members without username when team has no parentId", () => {
      const membersWithPending = [
        ...defaultTeamMembers,
        buildTeamMember({ id: 3, name: "Pending", username: null }),
      ];

      renderTab({
        schedulingType: SchedulingType.ROUND_ROBIN,
        teamMembers: membersWithPending,
      });

      const teamMembersPassed = getHostsMockCallProp("teamMembers") as any[];
      expect(teamMembersPassed).toHaveLength(2);
    });

    it("includes all members when team has parentId (org team)", () => {
      const orgTeam = buildTeam({ parentId: 200 });
      const membersWithPending = [
        ...defaultTeamMembers,
        buildTeamMember({ id: 3, name: "Pending", username: null }),
      ];

      render(
        <Wrapper formDefaults={buildFormValues({ schedulingType: SchedulingType.ROUND_ROBIN })}>
          <EventTeamAssignmentTab
            team={orgTeam as any}
            teamMembers={membersWithPending}
            eventType={buildEventType({ schedulingType: SchedulingType.ROUND_ROBIN, team: orgTeam })}
            orgId={null}
            isSegmentApplicable={false}
          />
        </Wrapper>
      );

      const teamMembersPassed = getHostsMockCallProp("teamMembers") as any[];
      expect(teamMembersPassed).toHaveLength(3);
    });

    it("removes current slug from eventTypeSlugs for existing children owners", () => {
      const members = [
        buildTeamMember({ id: 1, name: "Alice", eventTypes: ["test-event", "other-event"] }),
        buildTeamMember({ id: 2, name: "Bob", eventTypes: ["other-event"] }),
      ];

      const eventType = buildEventType({
        slug: "test-event",
        schedulingType: SchedulingType.MANAGED,
        children: [{ owner: { id: 1 } }] as any,
      });

      render(
        <Wrapper formDefaults={buildFormValues({ schedulingType: SchedulingType.MANAGED })}>
          <EventTeamAssignmentTab
            team={buildTeam() as any}
            teamMembers={members}
            eventType={eventType}
            orgId={null}
            isSegmentApplicable={false}
          />
        </Wrapper>
      );

      const options = getChildrenMockCallProp("childrenEventTypeOptions") as any[];
      const aliceOption = options.find((o: any) => o.owner.id === 1);
      const bobOption = options.find((o: any) => o.owner.id === 2);

      // Alice is an existing child owner — "test-event" (current slug) should be removed
      expect(aliceOption.owner.eventTypeSlugs).toEqual(["other-event"]);
      // Bob is NOT in children — his eventTypes stay unchanged
      expect(bobOption.owner.eventTypeSlugs).toEqual(["other-event"]);
    });
  });

  describe("prop wiring", () => {
    it("passes assignAllTeamMembers to Hosts", () => {
      renderTab({
        schedulingType: SchedulingType.ROUND_ROBIN,
        formDefaults: { assignAllTeamMembers: true },
      });

      expect(HostsMock).toHaveBeenCalledWith(
        expect.objectContaining({ assignAllTeamMembers: true })
      );
    });

    it("passes assignAllTeamMembers to ChildrenEventTypes", () => {
      renderTab({
        schedulingType: SchedulingType.MANAGED,
        formDefaults: { assignAllTeamMembers: true },
      });

      expect(ChildrenEventTypesMock).toHaveBeenCalledWith(
        expect.objectContaining({ assignAllTeamMembers: true })
      );
    });

    it("passes team props to Hosts", () => {
      renderTab({ schedulingType: SchedulingType.COLLECTIVE });

      expect(HostsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 100,
          orgId: null,
          isSegmentApplicable: false,
        })
      );
    });

    it("passes childrenEventTypeOptions to ChildrenEventTypes", () => {
      renderTab({ schedulingType: SchedulingType.MANAGED });

      expect(ChildrenEventTypesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          childrenEventTypeOptions: expect.arrayContaining([
            expect.objectContaining({ slug: "test-event" }),
          ]),
        })
      );
    });

    it("passes setAssignAllTeamMembers callback to Hosts", () => {
      renderTab({ schedulingType: SchedulingType.ROUND_ROBIN });

      expect(HostsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          setAssignAllTeamMembers: expect.any(Function),
        })
      );
    });

    it("passes setAssignAllTeamMembers callback to ChildrenEventTypes", () => {
      renderTab({ schedulingType: SchedulingType.MANAGED });

      expect(ChildrenEventTypesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          setAssignAllTeamMembers: expect.any(Function),
        })
      );
    });

    it("passes teamMembers to Hosts", () => {
      renderTab({ schedulingType: SchedulingType.ROUND_ROBIN });

      expect(HostsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          teamMembers: expect.arrayContaining([
            expect.objectContaining({ value: "1" }),
            expect.objectContaining({ value: "2" }),
          ]),
        })
      );
    });

    it("forwards hideFixedHostsForCollective to Hosts", () => {
      render(
        <Wrapper>
          <EventTeamAssignmentTab
            team={buildTeam() as any}
            teamMembers={defaultTeamMembers}
            eventType={buildEventType({ schedulingType: SchedulingType.COLLECTIVE })}
            orgId={null}
            isSegmentApplicable={false}
            hideFixedHostsForCollective={true}
          />
        </Wrapper>
      );

      expect(HostsMock).toHaveBeenCalledWith(
        expect.objectContaining({ hideFixedHostsForCollective: true })
      );
    });

    it("passes warning dialog props", async () => {
      renderTab({ schedulingType: SchedulingType.MANAGED });

      await waitFor(() => {
        expect(WarningDialogMock).toHaveBeenCalledWith(
          expect.objectContaining({
            isOpen: false,
            eventTypeSlug: "test-event",
            onConfirm: expect.any(Function),
            onClose: expect.any(Function),
          })
        );
      });
    });
  });
});
