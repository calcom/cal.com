import { act, renderHook } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { SchedulingType } from "@calcom/prisma/enums";

import type { useAssignAllManagedWarning } from "../use-assign-all-managed-warning";
import { useTeamEventAssignment } from "../use-team-event-assignment";

// --- Mocks ---

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/web/modules/event-types/components/AddMembersWithSwitch", () => ({
  mapUserToValue: vi.fn(
    (member: Record<string, unknown>, pendingString: string) => ({
      value: `${member.id || ""}`,
      label: `${member.name || member.email || ""}${!member.username ? ` (${pendingString})` : ""}`,
      avatar: (member.avatar as string) ?? "",
      email: member.email,
      defaultScheduleId: null,
    })
  ),
}));

const mockWarning: ReturnType<typeof useAssignAllManagedWarning> = {
  isOpen: false,
  shouldShowWarning: vi.fn().mockReturnValue(false),
  show: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
};

vi.mock("../use-assign-all-managed-warning", () => ({
  useAssignAllManagedWarning: () => mockWarning,
}));

// --- Test Data Builders ---

type TeamMemberInput = {
  id: number;
  name?: string;
  email?: string;
  username?: string | null;
  eventTypes?: string[];
  membership?: string;
  avatar?: string;
  profile?: Record<string, unknown>;
};

function buildTeamMember(overrides: TeamMemberInput) {
  return {
    id: overrides.id,
    name: overrides.name ?? `Member ${overrides.id}`,
    email: overrides.email ?? `member-${overrides.id}@test.com`,
    username: "username" in overrides ? overrides.username : `member-${overrides.id}`,
    membership: overrides.membership ?? "MEMBER",
    eventTypes: overrides.eventTypes ?? [],
    avatar: overrides.avatar ?? `avatar-${overrides.id}.png`,
    profile: overrides.profile ?? { id: overrides.id },
    defaultScheduleId: null,
  };
}

function buildEventType(overrides?: Record<string, unknown>) {
  return {
    slug: "test-event",
    children: [],
    schedulingType: SchedulingType.COLLECTIVE,
    team: { id: 100, parentId: null },
    ...overrides,
  };
}

function buildFormDefaults(overrides?: Partial<FormValues>): Partial<FormValues> {
  return {
    schedulingType: SchedulingType.COLLECTIVE,
    assignAllTeamMembers: false,
    children: [],
    hosts: [],
    slug: "test-event",
    ...overrides,
  };
}

const defaultTeamMembers = [
  buildTeamMember({ id: 1, name: "Alice", eventTypes: ["test-event"] }),
  buildTeamMember({ id: 2, name: "Bob", eventTypes: [] }),
];

// --- Helpers ---

function createWrapper(formDefaults?: Partial<FormValues>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const methods = useForm<FormValues>({
      defaultValues: buildFormDefaults(formDefaults) as FormValues,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(FormProvider as any, { ...methods }, children);
  };
}

function renderAssignmentHook({
  eventType,
  teamMembers = defaultTeamMembers,
  formDefaults,
}: {
  eventType?: ReturnType<typeof buildEventType>;
  teamMembers?: ReturnType<typeof buildTeamMember>[];
  formDefaults?: Partial<FormValues>;
} = {}) {
  const resolvedEventType = eventType ?? buildEventType();
  const wrapper = createWrapper(formDefaults);

  return renderHook(
    () =>
      useTeamEventAssignment({
        eventType: resolvedEventType as any,
        teamMembers: teamMembers as any,
      }),
    { wrapper }
  );
}

// --- Tests ---

describe("useTeamEventAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWarning.isOpen = false;
    vi.mocked(mockWarning.shouldShowWarning).mockReturnValue(false);
  });

  describe("initialization", () => {
    it("returns assignAllTeamMembers as false by default", () => {
      const { result } = renderAssignmentHook();

      expect(result.current.assignAllTeamMembers).toBe(false);
    });

    it("returns assignAllTeamMembers as true when form has it set", () => {
      const { result } = renderAssignmentHook({
        formDefaults: { assignAllTeamMembers: true },
      });

      expect(result.current.assignAllTeamMembers).toBe(true);
    });

    it("returns isManagedEventType true for MANAGED scheduling type", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      expect(result.current.isManagedEventType).toBe(true);
    });

    it("returns isManagedEventType false for COLLECTIVE scheduling type", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.COLLECTIVE }),
      });

      expect(result.current.isManagedEventType).toBe(false);
    });

    it("returns isManagedEventType false for ROUND_ROBIN scheduling type", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.ROUND_ROBIN }),
      });

      expect(result.current.isManagedEventType).toBe(false);
    });

    it("returns eventTypeSlug from useWatch (form slug)", () => {
      const { result } = renderAssignmentHook({
        formDefaults: { slug: "my-custom-slug" },
      });

      expect(result.current.eventTypeSlug).toBe("my-custom-slug");
    });

    it("returns all expected properties", () => {
      const { result } = renderAssignmentHook();

      expect(result.current).toEqual(
        expect.objectContaining({
          assignAllTeamMembers: expect.any(Boolean),
          attemptSetAssignAll: expect.any(Function),
          childrenEventTypeOptions: expect.any(Array),
          teamMembersOptions: expect.any(Array),
          eventTypeSlug: expect.any(String),
          isManagedEventType: expect.any(Boolean),
          resetAssignAll: expect.any(Function),
          warningDialog: expect.objectContaining({
            isOpen: expect.any(Boolean),
            onConfirm: expect.any(Function),
            onClose: expect.any(Function),
          }),
        })
      );
    });
  });

  describe("childrenEventTypeOptions", () => {
    it("maps team members to children options with correct shape", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      const options = result.current.childrenEventTypeOptions;
      expect(options).toHaveLength(2);

      expect(options[0]).toEqual(
        expect.objectContaining({
          slug: "test-event",
          hidden: false,
          created: false,
          owner: expect.objectContaining({
            id: 1,
            name: "Alice",
            email: "member-1@test.com",
            username: "member-1",
          }),
          value: "1",
          label: "Alice",
        })
      );
    });

    it("filters out members without username when team has no parentId", () => {
      const members = [
        ...defaultTeamMembers,
        buildTeamMember({ id: 3, name: "Pending", username: null }),
      ];

      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
        teamMembers: members,
      });

      expect(result.current.childrenEventTypeOptions).toHaveLength(2);
    });

    it("includes members without username when team has parentId (org team)", () => {
      const members = [
        ...defaultTeamMembers,
        buildTeamMember({ id: 3, name: "Pending", username: null }),
      ];

      const { result } = renderAssignmentHook({
        eventType: buildEventType({
          schedulingType: SchedulingType.MANAGED,
          team: { id: 100, parentId: 200 },
        }),
        teamMembers: members,
      });

      expect(result.current.childrenEventTypeOptions).toHaveLength(3);
    });

    it("removes current slug from eventTypeSlugs for existing children owners", () => {
      const members = [
        buildTeamMember({ id: 1, name: "Alice", eventTypes: ["test-event", "other-event"] }),
        buildTeamMember({ id: 2, name: "Bob", eventTypes: ["other-event"] }),
      ];

      const { result } = renderAssignmentHook({
        eventType: buildEventType({
          slug: "test-event",
          schedulingType: SchedulingType.MANAGED,
          children: [{ owner: { id: 1 } }],
        }),
        teamMembers: members,
      });

      const options = result.current.childrenEventTypeOptions;
      const aliceOption = options.find((o: any) => o.owner.id === 1);
      const bobOption = options.find((o: any) => o.owner.id === 2);

      // Alice is an existing child owner -- "test-event" is filtered out
      expect(aliceOption?.owner.eventTypeSlugs).toEqual(["other-event"]);
      // Bob is NOT in children -- his eventTypes stay unchanged
      expect(bobOption?.owner.eventTypeSlugs).toEqual(["other-event"]);
    });

    it("appends pending label for members without username", () => {
      const members = [buildTeamMember({ id: 1, name: "Alice", username: null })];

      const { result } = renderAssignmentHook({
        eventType: buildEventType({
          schedulingType: SchedulingType.MANAGED,
          team: { id: 100, parentId: 200 },
        }),
        teamMembers: members,
      });

      const options = result.current.childrenEventTypeOptions;
      expect(options[0].label).toBe("Alice (pending)");
    });
  });

  describe("teamMembersOptions", () => {
    it("maps team members via mapUserToValue", () => {
      const { result } = renderAssignmentHook();

      const options = result.current.teamMembersOptions;
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual(
        expect.objectContaining({
          value: "1",
          label: "Alice",
        })
      );
      expect(options[1]).toEqual(
        expect.objectContaining({
          value: "2",
          label: "Bob",
        })
      );
    });

    it("filters out pending members when team has no parentId", () => {
      const members = [
        ...defaultTeamMembers,
        buildTeamMember({ id: 3, name: "Pending", username: null }),
      ];

      const { result } = renderAssignmentHook({ teamMembers: members });

      expect(result.current.teamMembersOptions).toHaveLength(2);
    });

    it("includes pending members when team has parentId", () => {
      const members = [
        ...defaultTeamMembers,
        buildTeamMember({ id: 3, name: "Pending", username: null }),
      ];

      const { result } = renderAssignmentHook({
        eventType: buildEventType({ team: { id: 100, parentId: 200 } }),
        teamMembers: members,
      });

      expect(result.current.teamMembersOptions).toHaveLength(3);
    });
  });

  describe("attemptSetAssignAll for non-MANAGED types", () => {
    it("toggles directly without showing warning dialog", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.ROUND_ROBIN }),
      });

      act(() => {
        result.current.attemptSetAssignAll(true);
      });

      expect(mockWarning.shouldShowWarning).toHaveBeenCalledWith({
        schedulingType: SchedulingType.ROUND_ROBIN,
        oldAssignAllTeamMembers: false,
        newAssignAllTeamMembers: true,
      });
      expect(mockWarning.show).not.toHaveBeenCalled();
      expect(result.current.assignAllTeamMembers).toBe(true);
    });

    it("toggles off without showing warning dialog", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.ROUND_ROBIN }),
        formDefaults: { assignAllTeamMembers: true },
      });

      act(() => {
        result.current.attemptSetAssignAll(false);
      });

      expect(mockWarning.show).not.toHaveBeenCalled();
      expect(result.current.assignAllTeamMembers).toBe(false);
    });
  });

  describe("attemptSetAssignAll for MANAGED types", () => {
    it("shows warning dialog on OFF to ON for MANAGED types", () => {
      vi.mocked(mockWarning.shouldShowWarning).mockReturnValue(true);

      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      act(() => {
        result.current.attemptSetAssignAll(true);
      });

      expect(mockWarning.shouldShowWarning).toHaveBeenCalledWith({
        schedulingType: SchedulingType.MANAGED,
        oldAssignAllTeamMembers: false,
        newAssignAllTeamMembers: true,
      });
      expect(mockWarning.show).toHaveBeenCalledOnce();
      // Should NOT toggle yet -- waiting for user confirmation
      expect(result.current.assignAllTeamMembers).toBe(false);
    });

    it("does not show warning when toggling OFF for MANAGED types", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
        formDefaults: { assignAllTeamMembers: true },
      });

      act(() => {
        result.current.attemptSetAssignAll(false);
      });

      expect(mockWarning.show).not.toHaveBeenCalled();
      expect(result.current.assignAllTeamMembers).toBe(false);
    });
  });

  describe("confirmWarning", () => {
    it("confirms the warning and toggles ON", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      act(() => {
        result.current.warningDialog.onConfirm();
      });

      expect(mockWarning.confirm).toHaveBeenCalledOnce();
      expect(result.current.assignAllTeamMembers).toBe(true);
    });

    it("auto-populates children for MANAGED types on confirm", () => {
      const setValueSpy = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => {
        const methods = useForm<FormValues>({
          defaultValues: buildFormDefaults({
            schedulingType: SchedulingType.MANAGED,
          }) as FormValues,
        });
        // Spy on setValue
        const originalSetValue = methods.setValue;
        methods.setValue = (...args: Parameters<typeof originalSetValue>) => {
          setValueSpy(...args);
          return originalSetValue(...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(FormProvider as any, { ...methods }, children);
      };

      const { result } = renderHook(
        () =>
          useTeamEventAssignment({
            eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }) as any,
            teamMembers: defaultTeamMembers as any,
          }),
        { wrapper }
      );

      act(() => {
        result.current.warningDialog.onConfirm();
      });

      // Should have called setValue for both "assignAllTeamMembers" and "children"
      expect(setValueSpy).toHaveBeenCalledWith("assignAllTeamMembers", true, { shouldDirty: true });
      expect(setValueSpy).toHaveBeenCalledWith(
        "children",
        expect.arrayContaining([
          expect.objectContaining({ slug: "test-event", owner: expect.objectContaining({ id: 1 }) }),
          expect.objectContaining({ slug: "test-event", owner: expect.objectContaining({ id: 2 }) }),
        ]),
        { shouldDirty: true }
      );
    });
  });

  describe("handleToggle behavior via attemptSetAssignAll", () => {
    it("sets assignAllTeamMembers AND populates children for MANAGED when toggling ON", () => {
      const setValueSpy = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => {
        const methods = useForm<FormValues>({
          defaultValues: buildFormDefaults({
            schedulingType: SchedulingType.MANAGED,
          }) as FormValues,
        });
        const originalSetValue = methods.setValue;
        methods.setValue = (...args: Parameters<typeof originalSetValue>) => {
          setValueSpy(...args);
          return originalSetValue(...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(FormProvider as any, { ...methods }, children);
      };

      const { result } = renderHook(
        () =>
          useTeamEventAssignment({
            eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }) as any,
            teamMembers: defaultTeamMembers as any,
          }),
        { wrapper }
      );

      // shouldShowWarning returns false => handleToggle is called directly
      act(() => {
        result.current.attemptSetAssignAll(true);
      });

      expect(setValueSpy).toHaveBeenCalledWith("assignAllTeamMembers", true, { shouldDirty: true });
      expect(setValueSpy).toHaveBeenCalledWith("children", expect.any(Array), { shouldDirty: true });
    });

    it("sets assignAllTeamMembers but does NOT populate children for non-MANAGED", () => {
      const setValueSpy = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => {
        const methods = useForm<FormValues>({
          defaultValues: buildFormDefaults({
            schedulingType: SchedulingType.ROUND_ROBIN,
          }) as FormValues,
        });
        const originalSetValue = methods.setValue;
        methods.setValue = (...args: Parameters<typeof originalSetValue>) => {
          setValueSpy(...args);
          return originalSetValue(...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(FormProvider as any, { ...methods }, children);
      };

      const { result } = renderHook(
        () =>
          useTeamEventAssignment({
            eventType: buildEventType({ schedulingType: SchedulingType.ROUND_ROBIN }) as any,
            teamMembers: defaultTeamMembers as any,
          }),
        { wrapper }
      );

      act(() => {
        result.current.attemptSetAssignAll(true);
      });

      expect(setValueSpy).toHaveBeenCalledWith("assignAllTeamMembers", true, { shouldDirty: true });
      expect(setValueSpy).not.toHaveBeenCalledWith("children", expect.anything(), expect.anything());
    });
  });

  describe("resetAssignAll", () => {
    it("resets assignAllTeamMembers to false", () => {
      const { result } = renderAssignmentHook({
        formDefaults: { assignAllTeamMembers: true },
      });

      expect(result.current.assignAllTeamMembers).toBe(true);

      act(() => {
        result.current.resetAssignAll();
      });

      expect(result.current.assignAllTeamMembers).toBe(false);
    });

    it("sets the form value to false via setValue", () => {
      const setValueSpy = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => {
        const methods = useForm<FormValues>({
          defaultValues: buildFormDefaults({ assignAllTeamMembers: true }) as FormValues,
        });
        const originalSetValue = methods.setValue;
        methods.setValue = (...args: Parameters<typeof originalSetValue>) => {
          setValueSpy(...args);
          return originalSetValue(...args);
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(FormProvider as any, { ...methods }, children);
      };

      const { result } = renderHook(
        () =>
          useTeamEventAssignment({
            eventType: buildEventType() as any,
            teamMembers: defaultTeamMembers as any,
          }),
        { wrapper }
      );

      act(() => {
        result.current.resetAssignAll();
      });

      expect(setValueSpy).toHaveBeenCalledWith("assignAllTeamMembers", false, { shouldDirty: true });
    });
  });

  describe("warningDialog", () => {
    it("returns isOpen from the warning hook", () => {
      mockWarning.isOpen = true;

      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      expect(result.current.warningDialog.isOpen).toBe(true);
    });

    it("returns isOpen as false by default", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      expect(result.current.warningDialog.isOpen).toBe(false);
    });

    it("onClose calls assignAllManagedWarning.cancel", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      act(() => {
        result.current.warningDialog.onClose();
      });

      expect(mockWarning.cancel).toHaveBeenCalledOnce();
    });

    it("onConfirm calls confirm and handleToggle(true)", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
      });

      act(() => {
        result.current.warningDialog.onConfirm();
      });

      expect(mockWarning.confirm).toHaveBeenCalledOnce();
      expect(result.current.assignAllTeamMembers).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty team members array", () => {
      const { result } = renderAssignmentHook({
        teamMembers: [],
      });

      expect(result.current.childrenEventTypeOptions).toEqual([]);
      expect(result.current.teamMembersOptions).toEqual([]);
    });

    it("falls back to eventType.slug when form slug is not set", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => {
        const methods = useForm<FormValues>({
          defaultValues: buildFormDefaults({ slug: undefined }) as FormValues,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(FormProvider as any, { ...methods }, children);
      };

      const { result } = renderHook(
        () =>
          useTeamEventAssignment({
            eventType: buildEventType({ slug: "event-type-slug" }) as any,
            teamMembers: defaultTeamMembers as any,
          }),
        { wrapper }
      );

      // useWatch returns undefined for slug => falls back to eventType.slug
      expect(result.current.eventTypeSlug).toBe("event-type-slug");
    });

    it("uses email as label when member has no name", () => {
      const members = [buildTeamMember({ id: 1, name: "", email: "noname@test.com" })];

      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
        teamMembers: members,
      });

      const options = result.current.childrenEventTypeOptions;
      expect(options[0].label).toBe("noname@test.com");
    });

    it("handles member with null name", () => {
      const members = [buildTeamMember({ id: 1, name: undefined, email: "null-name@test.com" })];
      // Override name to null explicitly (buildTeamMember defaults to "Member 1")
      (members[0] as any).name = null;

      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.MANAGED }),
        teamMembers: members,
      });

      const options = result.current.childrenEventTypeOptions;
      // mapMemberToChildrenOption uses: member.name || member.email || ""
      expect(options[0].label).toBe("null-name@test.com");
    });

    it("multiple toggle ON/OFF cycles update correctly", () => {
      const { result } = renderAssignmentHook({
        eventType: buildEventType({ schedulingType: SchedulingType.ROUND_ROBIN }),
      });

      expect(result.current.assignAllTeamMembers).toBe(false);

      act(() => {
        result.current.attemptSetAssignAll(true);
      });
      expect(result.current.assignAllTeamMembers).toBe(true);

      act(() => {
        result.current.attemptSetAssignAll(false);
      });
      expect(result.current.assignAllTeamMembers).toBe(false);

      act(() => {
        result.current.attemptSetAssignAll(true);
      });
      expect(result.current.assignAllTeamMembers).toBe(true);
    });
  });
});
