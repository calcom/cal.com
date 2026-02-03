import { render } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { vi } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";
import { EditMemberSheet } from "@calcom/web/modules/ee/teams/components/EditMemberSheet";
import type { MemberPermissions } from "@calcom/features/pbac/lib/team-member-permissions";

import type { State, User } from "./MemberList";

// Mock dependencies
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      pbac: {
        getTeamRoles: {
          useQuery: () => ({
            data: undefined,
            isPending: false,
          }),
        },
      },
      teams: {
        getUserConnectedApps: {
          useQuery: () => ({
            data: {},
            isPending: false,
          }),
        },
        changeMemberRole: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
          }),
        },
        listMembers: {
          cancel: vi.fn(),
          getInfiniteData: vi.fn(),
          invalidate: vi.fn(),
        },
        get: {
          setData: vi.fn(),
          invalidate: vi.fn(),
        },
      },
    },
    useUtils: () => ({
      viewer: {
        teams: {
          listMembers: {
            cancel: vi.fn(),
            getInfiniteData: vi.fn(),
            invalidate: vi.fn(),
          },
          get: {
            setData: vi.fn(),
            invalidate: vi.fn(),
          },
        },
      },
    }),
  },
}));

const mockSetEditMode = vi.fn();
const mockSetMutationLoading = vi.fn();

vi.mock("@calcom/web/modules/users/components/UserTable/EditSheet/store", () => ({
  useEditMode: (
    selector: (state: {
      editMode: boolean;
      setEditMode: typeof mockSetEditMode;
      mutationLoading: boolean;
      setMutationLoading: typeof mockSetMutationLoading;
    }) => unknown
  ) => {
    const state = {
      editMode: false,
      setEditMode: mockSetEditMode,
      mutationLoading: false,
      setMutationLoading: mockSetMutationLoading,
    };
    if (typeof selector === "function") {
      return selector(state);
    }
    return state;
  },
}));

// Mock SheetFooterControls to verify props
let capturedProps: { canChangeMemberRole?: boolean; canEditAttributesForUser?: boolean }[] = [];
vi.mock("@calcom/web/modules/users/components/UserTable/EditSheet/SheetFooterControls", () => ({
  SheetFooterControls: (props: { canChangeMemberRole?: boolean; canEditAttributesForUser?: boolean }) => {
    capturedProps.push(props);
    return React.createElement("div", { "data-testid": "sheet-footer-controls" }, "SheetFooterControls");
  },
}));

// Mock other UI components
vi.mock("@calcom/ui/components/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet" }, children),
  SheetContent: ({ children }: { children: ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet-content" }, children),
  SheetHeader: ({ children }: { children: ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet-header" }, children),
  SheetBody: ({ children }: { children: ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet-body" }, children),
  SheetFooter: ({ children }: { children: ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet-footer" }, children),
}));

vi.mock("@calcom/ui/components/form", () => ({
  Form: ({ children }: { children: ReactNode }) => React.createElement("form", null, children),
  ToggleGroup: () => React.createElement("div", { "data-testid": "toggle-group" }, "ToggleGroup"),
  Select: () => React.createElement("div", { "data-testid": "select" }, "Select"),
}));

vi.mock("@calcom/ui/components/avatar", () => ({
  Avatar: () => React.createElement("div", { "data-testid": "avatar" }, "Avatar"),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  Skeleton: ({ children }: { children: ReactNode }) => React.createElement("div", null, children),
  Loader: () => React.createElement("div", { "data-testid": "loader" }, "Loading..."),
}));

vi.mock("@calcom/web/modules/users/components/UserTable/EditSheet/DisplayInfo", () => ({
  DisplayInfo: () => <div data-testid="display-info">DisplayInfo</div>,
}));

describe("EditMemberSheet", () => {
  const mockDispatch = vi.fn();

  // Create a minimal mock user that satisfies the User type
  const mockUser = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    username: "testuser",
    role: MembershipRole.MEMBER,
    accepted: true,
    avatarUrl: "",
    bookerUrl: "https://cal.com",
    lastActiveAt: "2024-01-01",
    customRoleId: null,
  } as User;

  const mockState: State = {
    editSheet: {
      user: mockUser,
      showModal: true,
    },
    deleteMember: {
      showModal: false,
    },
    impersonateMember: {
      showModal: false,
    },
    teamAvailability: {
      showModal: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetEditMode.mockClear();
    mockSetMutationLoading.mockClear();
    capturedProps = [];
  });

  describe("Fix verification: canChangeMemberRole prop passing", () => {
    it("should pass canChangeMemberRole=true to SheetFooterControls when permissions.canChangeMemberRole is true", () => {
      const permissions: MemberPermissions = {
        canListMembers: false,
        canInvite: false,
        canChangeMemberRole: true,
        canRemove: false,
        canImpersonate: false,
      };

      render(
        <EditMemberSheet
          state={mockState}
          dispatch={mockDispatch}
          currentMember={MembershipRole.OWNER}
          teamId={1}
          permissions={permissions}
        />
      );

      // Verify SheetFooterControls was called with canChangeMemberRole=true
      expect(capturedProps).toContainEqual(
        expect.objectContaining({
          canChangeMemberRole: true,
        })
      );
    });

    it("should pass canChangeMemberRole=false to SheetFooterControls when permissions.canChangeMemberRole is false", () => {
      const permissions: MemberPermissions = {
        canListMembers: false,
        canInvite: false,
        canChangeMemberRole: false,
        canRemove: false,
        canImpersonate: false,
      };

      render(
        <EditMemberSheet
          state={mockState}
          dispatch={mockDispatch}
          currentMember={MembershipRole.OWNER}
          teamId={1}
          permissions={permissions}
        />
      );

      // Verify SheetFooterControls was called with canChangeMemberRole=false
      expect(capturedProps).toContainEqual(
        expect.objectContaining({
          canChangeMemberRole: false,
        })
      );
    });

    it("should pass canChangeMemberRole=undefined to SheetFooterControls when permissions is undefined", () => {
      render(
        <EditMemberSheet
          state={mockState}
          dispatch={mockDispatch}
          currentMember={MembershipRole.OWNER}
          teamId={1}
          permissions={undefined}
        />
      );

      // Verify SheetFooterControls was called with canChangeMemberRole=undefined
      expect(capturedProps).toContainEqual(
        expect.objectContaining({
          canChangeMemberRole: undefined,
        })
      );
    });

    it("should pass canChangeMemberRole=undefined to SheetFooterControls when permissions object exists but canChangeMemberRole is undefined", () => {
      const permissions: Partial<MemberPermissions> = {
        canListMembers: true,
        canInvite: false,
        // canChangeMemberRole is intentionally omitted
      };

      render(
        <EditMemberSheet
          state={mockState}
          dispatch={mockDispatch}
          currentMember={MembershipRole.OWNER}
          teamId={1}
          permissions={permissions as MemberPermissions}
        />
      );

      // Verify SheetFooterControls was called with canChangeMemberRole=undefined
      expect(capturedProps).toContainEqual(
        expect.objectContaining({
          canChangeMemberRole: undefined,
        })
      );
    });

    it("should pass canEditAttributesForUser from permissions to SheetFooterControls", () => {
      const permissions: MemberPermissions = {
        canListMembers: false,
        canInvite: false,
        canChangeMemberRole: true,
        canRemove: false,
        canImpersonate: false,
        canEditAttributesForUser: true,
      };

      render(
        <EditMemberSheet
          state={mockState}
          dispatch={mockDispatch}
          currentMember={MembershipRole.OWNER}
          teamId={1}
          permissions={permissions}
        />
      );

      // Verify SheetFooterControls was called with both props
      expect(capturedProps).toContainEqual(
        expect.objectContaining({
          canChangeMemberRole: true,
          canEditAttributesForUser: true,
        })
      );
    });

    it("should correctly extract canChangeMemberRole from permissions object (verifies fix)", () => {
      // This test specifically verifies the fix where permissions?.canChangeMemberRole
      // is now correctly passed to SheetFooterControls
      const permissions: MemberPermissions = {
        canListMembers: false,
        canInvite: false,
        canChangeMemberRole: true, // This should be passed to SheetFooterControls
        canRemove: false,
        canImpersonate: false,
      };

      render(
        <EditMemberSheet
          state={mockState}
          dispatch={mockDispatch}
          currentMember={MembershipRole.OWNER}
          teamId={1}
          permissions={permissions}
        />
      );

      expect(capturedProps).toContainEqual(
        expect.objectContaining({
          canChangeMemberRole: true,
        })
      );
    });
  });
});
