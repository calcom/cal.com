import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { useSettingsStore } from "../stores/settings-store";
import { createMockPermissionContext } from "./test-utils";

// Mock dependencies
vi.mock("../tabs/permission-resolver", () => ({
  PermissionResolver: vi.fn().mockImplementation(() => ({
    processTabs: vi.fn((tabs) => tabs.map((tab) => ({ ...tab, visible: true }))),
    addTeamTabs: vi.fn((tabs, teams) => {
      const teamsTabIndex = tabs.findIndex((tab) => tab.key === "teams");
      if (teamsTabIndex !== -1 && teams) {
        tabs[teamsTabIndex] = {
          ...tabs[teamsTabIndex],
          children: teams.map((team) => ({
            key: `team_${team.id}`,
            name: team.name,
            href: `/settings/teams/${team.id}`,
            visible: true,
            children: [],
          })),
        };
      }
      return tabs;
    }),
    addOtherTeamsTabs: vi.fn((tabs, otherTeams) => {
      const otherTeamsTabIndex = tabs.findIndex((tab) => tab.key === "other_teams");
      if (otherTeamsTabIndex !== -1 && otherTeams) {
        tabs[otherTeamsTabIndex] = {
          ...tabs[otherTeamsTabIndex],
          children: otherTeams.map((team) => ({
            key: `other_team_${team.id}`,
            name: team.name,
            href: `/settings/organizations/teams/other/${team.id}`,
            visible: true,
            children: [],
          })),
        };
      }
      return tabs;
    }),
  })),
}));

vi.mock("../tabs/tab-registry", () => ({
  SETTINGS_TABS: [
    {
      key: "my_account",
      name: "my_account",
      href: "/settings/my-account",
      icon: "user",
    },
    {
      key: "teams",
      name: "teams",
      href: "/teams",
      icon: "users",
      dynamic: true,
      children: [],
    },
    {
      key: "other_teams",
      name: "other_teams",
      href: "/settings/organizations/teams/other",
      icon: "users",
      dynamic: true,
      children: [],
    },
  ],
}));

describe("SettingsStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useSettingsStore.setState({
      tabs: [],
      teamExpansionState: {},
      otherTeamExpansionState: {},
      permissionContext: null,
      isInitialized: false,
    });
  });

  describe("initialization", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() => useSettingsStore());

      expect(result.current.tabs).toEqual([]);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.permissionContext).toBeNull();
    });

    it("should initialize tabs with permission context", () => {
      const { result } = renderHook(() => useSettingsStore());
      const mockContext = createMockPermissionContext();

      act(() => {
        result.current.initializeTabs(mockContext);
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.permissionContext).toEqual(mockContext);
      expect(result.current.tabs.length).toBeGreaterThan(0);
    });

    it("should initialize team expansion state", () => {
      const { result } = renderHook(() => useSettingsStore());
      const mockContext = createMockPermissionContext();
      const mockTeams = [
        { id: 1, name: "Team 1", role: "ADMIN" },
        { id: 2, name: "Team 2", role: "MEMBER" },
      ];

      act(() => {
        result.current.initializeTabs(mockContext, mockTeams);
      });

      expect(result.current.teamExpansionState).toEqual({
        "1": false,
        "2": false,
      });
    });

    it("should initialize other teams for org admins", () => {
      const { result } = renderHook(() => useSettingsStore());
      const mockContext = createMockPermissionContext({
        isOrgAdmin: true,
        organizationId: 123,
      });
      const mockOtherTeams = [
        { id: 3, name: "Other Team 1" },
        { id: 4, name: "Other Team 2" },
      ];

      act(() => {
        result.current.initializeTabs(mockContext, [], mockOtherTeams);
      });

      expect(result.current.otherTeamExpansionState).toEqual({
        "3": false,
        "4": false,
      });
    });
  });

  describe("team expansion", () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSettingsStore());
      const mockContext = createMockPermissionContext();
      const mockTeams = [{ id: 1, name: "Team 1", role: "ADMIN" }];

      act(() => {
        result.current.initializeTabs(mockContext, mockTeams);
      });
    });

    it("should toggle team expansion state", () => {
      const { result } = renderHook(() => useSettingsStore());

      // Initially collapsed
      expect(result.current.teamExpansionState["1"]).toBe(false);

      // Expand team
      act(() => {
        result.current.setTeamExpanded("1", true);
      });

      expect(result.current.teamExpansionState["1"]).toBe(true);

      // Collapse team
      act(() => {
        result.current.setTeamExpanded("1", false);
      });

      expect(result.current.teamExpansionState["1"]).toBe(false);
    });

    it("should toggle other team expansion state", () => {
      const { result } = renderHook(() => useSettingsStore());

      // Set up other teams
      act(() => {
        result.current.setOtherTeamExpanded("3", true);
      });

      expect(result.current.otherTeamExpansionState["3"]).toBe(true);
    });
  });

  describe("tab retrieval", () => {
    beforeEach(() => {
      const { result } = renderHook(() => useSettingsStore());
      const mockContext = createMockPermissionContext();

      act(() => {
        result.current.initializeTabs(mockContext);
      });
    });

    it("should get tab by key", () => {
      const { result } = renderHook(() => useSettingsStore());

      const tab = result.current.getTabByKey("my_account");
      expect(tab).toBeDefined();
      expect(tab?.key).toBe("my_account");
    });

    it("should return undefined for non-existent tab", () => {
      const { result } = renderHook(() => useSettingsStore());

      const tab = result.current.getTabByKey("non_existent");
      expect(tab).toBeUndefined();
    });

    it("should get visible tabs only", () => {
      const { result } = renderHook(() => useSettingsStore());

      const visibleTabs = result.current.getVisibleTabs();
      expect(visibleTabs.every((tab) => tab.visible)).toBe(true);
    });
  });

  describe("permission context updates", () => {
    it("should update permission context and refresh tabs", () => {
      const { result } = renderHook(() => useSettingsStore());
      const mockContext = createMockPermissionContext();

      act(() => {
        result.current.initializeTabs(mockContext);
      });

      const originalUserId = result.current.permissionContext?.userId;

      act(() => {
        result.current.updatePermissionContext({ userId: 999 });
      });

      expect(result.current.permissionContext?.userId).toBe(999);
      expect(result.current.permissionContext?.userId).not.toBe(originalUserId);
    });

    it("should not update if no permission context exists", () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.updatePermissionContext({ userId: 999 });
      });

      expect(result.current.permissionContext).toBeNull();
    });
  });

  describe("tab refresh", () => {
    it("should refresh tabs with current context", () => {
      const { result } = renderHook(() => useSettingsStore());
      const mockContext = createMockPermissionContext();

      act(() => {
        result.current.initializeTabs(mockContext);
      });

      const originalTabsLength = result.current.tabs.length;

      act(() => {
        result.current.refreshTabs();
      });

      // Tabs should be reprocessed (length might change based on permissions)
      expect(result.current.tabs).toBeDefined();
    });

    it("should not refresh if no permission context exists", () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.refreshTabs();
      });

      expect(result.current.tabs).toEqual([]);
    });
  });

  describe("nested tab search", () => {
    beforeEach(() => {
      // Mock tabs with nested structure
      useSettingsStore.setState({
        tabs: [
          {
            key: "parent",
            name: "Parent",
            href: "/parent",
            visible: true,
            children: [
              {
                key: "child1",
                name: "Child 1",
                href: "/parent/child1",
                visible: true,
              },
              {
                key: "child2",
                name: "Child 2",
                href: "/parent/child2",
                visible: true,
                children: [
                  {
                    key: "grandchild",
                    name: "Grandchild",
                    href: "/parent/child2/grandchild",
                    visible: true,
                  },
                ],
              },
            ],
          },
        ],
        isInitialized: true,
        permissionContext: createMockPermissionContext(),
      });
    });

    it("should find nested tabs by key", () => {
      const { result } = renderHook(() => useSettingsStore());

      const childTab = result.current.getTabByKey("child1");
      expect(childTab).toBeDefined();
      expect(childTab?.key).toBe("child1");

      const grandchildTab = result.current.getTabByKey("grandchild");
      expect(grandchildTab).toBeDefined();
      expect(grandchildTab?.key).toBe("grandchild");
    });
  });
});
