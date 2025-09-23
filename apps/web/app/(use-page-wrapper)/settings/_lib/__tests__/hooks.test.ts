import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";

import { useSettingsTabs, useTeamExpansion, useSettingsPermissions } from "../hooks/useSettingsTabs";
import { useSettingsStore } from "../stores/settings-store";
import { createMockPermissionContext, createMockResourcePermissions } from "./test-utils";

// Mock the store
vi.mock("../stores/settings-store");

describe("useSettingsTabs", () => {
  const mockTabs = [
    {
      key: "tab1",
      name: "Tab 1",
      href: "/tab1",
      visible: true,
      children: [
        {
          key: "child1",
          name: "Child 1",
          href: "/tab1/child1",
          visible: true,
        },
      ],
    },
    {
      key: "tab2",
      name: "Tab 2",
      href: "/tab2",
      visible: true,
    },
  ];

  beforeEach(() => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        tabs: mockTabs,
        getTabByKey: (key: string) => {
          const findTab = (tabs: any[], targetKey: string): any => {
            for (const tab of tabs) {
              if (tab.key === targetKey) return tab;
              if (tab.children) {
                const found = findTab(tab.children, targetKey);
                if (found) return found;
              }
            }
            return undefined;
          };
          return findTab(mockTabs, key);
        },
        getVisibleTabs: () => mockTabs.filter((tab) => tab.visible),
        permissionContext: createMockPermissionContext(),
      };
      return selector(state);
    });
  });

  it("should return tabs and utility functions", () => {
    const { result } = renderHook(() => useSettingsTabs());

    expect(result.current.tabs).toEqual(mockTabs);
    expect(result.current.visibleTabs).toEqual(mockTabs);
    expect(typeof result.current.findTabByHref).toBe("function");
    expect(typeof result.current.getTabByKey).toBe("function");
  });

  it("should find tab by href", () => {
    const { result } = renderHook(() => useSettingsTabs());

    const tab = result.current.findTabByHref("/tab1");
    expect(tab?.key).toBe("tab1");

    const childTab = result.current.findTabByHref("/tab1/child1");
    expect(childTab?.key).toBe("child1");

    const nonExistent = result.current.findTabByHref("/nonexistent");
    expect(nonExistent).toBeUndefined();
  });

  it("should check if tab is visible", () => {
    const { result } = renderHook(() => useSettingsTabs());

    expect(result.current.isTabVisible("tab1")).toBe(true);
    expect(result.current.isTabVisible("nonexistent")).toBe(false);
  });

  it("should get tab path", () => {
    const { result } = renderHook(() => useSettingsTabs());

    const path = result.current.getTabPath("child1");
    expect(path).toEqual(["tab1", "child1"]);

    const rootPath = result.current.getTabPath("tab2");
    expect(rootPath).toEqual(["tab2"]);
  });

  it("should create flat tabs list", () => {
    const { result } = renderHook(() => useSettingsTabs());

    expect(result.current.flatTabs).toHaveLength(3); // tab1, child1, tab2
    expect(result.current.flatTabs.map((t) => t.key)).toEqual(["tab1", "child1", "tab2"]);
  });
});

describe("useTeamExpansion", () => {
  const mockTeamState = {
    "1": true,
    "2": false,
  };
  const mockOtherTeamState = {
    "3": false,
    "4": true,
  };

  beforeEach(() => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        teamExpansionState: mockTeamState,
        otherTeamExpansionState: mockOtherTeamState,
        setTeamExpanded: vi.fn(),
        setOtherTeamExpanded: vi.fn(),
      };
      return selector(state);
    });
  });

  it("should return expansion states and functions", () => {
    const { result } = renderHook(() => useTeamExpansion());

    expect(result.current.teamExpansionState).toEqual(mockTeamState);
    expect(result.current.otherTeamExpansionState).toEqual(mockOtherTeamState);
    expect(typeof result.current.toggleTeam).toBe("function");
    expect(typeof result.current.expandAllTeams).toBe("function");
    expect(typeof result.current.collapseAllTeams).toBe("function");
  });

  it("should check if team is expanded", () => {
    const { result } = renderHook(() => useTeamExpansion());

    expect(result.current.isTeamExpanded("1")).toBe(true);
    expect(result.current.isTeamExpanded("2")).toBe(false);
    expect(result.current.isTeamExpanded("3", "other_teams")).toBe(false);
    expect(result.current.isTeamExpanded("4", "other_teams")).toBe(true);
  });

  it("should toggle team expansion", () => {
    const mockSetTeamExpanded = vi.fn();
    const mockSetOtherTeamExpanded = vi.fn();

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        teamExpansionState: mockTeamState,
        otherTeamExpansionState: mockOtherTeamState,
        setTeamExpanded: mockSetTeamExpanded,
        setOtherTeamExpanded: mockSetOtherTeamExpanded,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useTeamExpansion());

    act(() => {
      result.current.toggleTeam("1");
    });

    expect(mockSetTeamExpanded).toHaveBeenCalledWith("1", false); // Was true, should toggle to false

    act(() => {
      result.current.toggleTeam("3", "other_teams");
    });

    expect(mockSetOtherTeamExpanded).toHaveBeenCalledWith("3", true); // Was false, should toggle to true
  });

  it("should expand all teams", () => {
    const mockSetTeamExpanded = vi.fn();
    const mockSetOtherTeamExpanded = vi.fn();

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        teamExpansionState: mockTeamState,
        otherTeamExpansionState: mockOtherTeamState,
        setTeamExpanded: mockSetTeamExpanded,
        setOtherTeamExpanded: mockSetOtherTeamExpanded,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useTeamExpansion());

    act(() => {
      result.current.expandAllTeams();
    });

    expect(mockSetTeamExpanded).toHaveBeenCalledWith("1", true);
    expect(mockSetTeamExpanded).toHaveBeenCalledWith("2", true);
    expect(mockSetOtherTeamExpanded).toHaveBeenCalledWith("3", true);
    expect(mockSetOtherTeamExpanded).toHaveBeenCalledWith("4", true);
  });

  it("should collapse all teams", () => {
    const mockSetTeamExpanded = vi.fn();
    const mockSetOtherTeamExpanded = vi.fn();

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        teamExpansionState: mockTeamState,
        otherTeamExpansionState: mockOtherTeamState,
        setTeamExpanded: mockSetTeamExpanded,
        setOtherTeamExpanded: mockSetOtherTeamExpanded,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useTeamExpansion());

    act(() => {
      result.current.collapseAllTeams();
    });

    expect(mockSetTeamExpanded).toHaveBeenCalledWith("1", false);
    expect(mockSetTeamExpanded).toHaveBeenCalledWith("2", false);
    expect(mockSetOtherTeamExpanded).toHaveBeenCalledWith("3", false);
    expect(mockSetOtherTeamExpanded).toHaveBeenCalledWith("4", false);
  });
});

describe("useSettingsPermissions", () => {
  const mockPermissionContext = createMockPermissionContext({
    organizationId: 123,
    isOrgAdmin: true,
    isOrgOwner: false,
    isAdmin: false,
    features: {
      "awesome-feature": true,
      "disabled-feature": false,
      "team-feature_456": true,
    },
    resourcePermissions: createMockResourcePermissions(Resource.Role, {
      [CrudAction.Read]: true,
      [CrudAction.Create]: false,
    }),
    teamMemberships: [
      { id: 456, role: "ADMIN", parentId: null, accepted: true },
      { id: 789, role: "MEMBER", parentId: null, accepted: true },
    ],
  });

  beforeEach(() => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        permissionContext: mockPermissionContext,
      };
      return selector(state);
    });
  });

  it("should check organization permissions", () => {
    const { result } = renderHook(() => useSettingsPermissions());

    expect(result.current.hasOrgPermission()).toBe(true);
    expect(result.current.isOrgAdmin()).toBe(true);
    expect(result.current.isOrgOwner()).toBe(false);
    expect(result.current.isSystemAdmin()).toBe(false);
  });

  it("should check feature flags", () => {
    const { result } = renderHook(() => useSettingsPermissions());

    expect(result.current.hasFeature("awesome-feature")).toBe(true);
    expect(result.current.hasFeature("disabled-feature")).toBe(false);
    expect(result.current.hasFeature("nonexistent-feature")).toBe(false);
    expect(result.current.hasFeature("team-feature", 456)).toBe(true);
    expect(result.current.hasFeature("team-feature", 999)).toBe(false);
  });

  it("should check resource permissions", () => {
    const { result } = renderHook(() => useSettingsPermissions());

    expect(result.current.hasResourcePermission(Resource.Role, CrudAction.Read)).toBe(true);
    expect(result.current.hasResourcePermission(Resource.Role, CrudAction.Create)).toBe(false);
    expect(result.current.hasResourcePermission("nonexistent", CrudAction.Read)).toBe(false);
  });

  it("should check team management permissions", () => {
    const { result } = renderHook(() => useSettingsPermissions());

    expect(result.current.canManageTeam(456)).toBe(true); // User is ADMIN
    expect(result.current.canManageTeam(789)).toBe(false); // User is MEMBER
    expect(result.current.canManageTeam(999)).toBe(false); // User not in team
  });

  it("should handle null permission context", () => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        permissionContext: null,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useSettingsPermissions());

    expect(result.current.hasOrgPermission()).toBe(false);
    expect(result.current.isOrgAdmin()).toBe(false);
    expect(result.current.hasFeature("any-feature")).toBe(false);
    expect(result.current.hasResourcePermission("any", "any")).toBe(false);
    expect(result.current.canManageTeam(123)).toBe(false);
  });
});
