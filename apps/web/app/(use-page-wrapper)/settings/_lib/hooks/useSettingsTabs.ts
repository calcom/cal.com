import { useCallback, useMemo } from "react";
import { useSettingsStore } from "../stores/settings-store";
import type { ProcessedTab } from "../tabs/types";

/**
 * Hook to access and manipulate settings tabs
 */
export function useSettingsTabs() {
  const tabs = useSettingsStore((state) => state.tabs);
  const getTabByKey = useSettingsStore((state) => state.getTabByKey);
  const getVisibleTabs = useSettingsStore((state) => state.getVisibleTabs);
  const permissionContext = useSettingsStore((state) => state.permissionContext);

  const findTabByHref = useCallback(
    (href: string): ProcessedTab | undefined => {
      const findInTabs = (tabList: ProcessedTab[]): ProcessedTab | undefined => {
        for (const tab of tabList) {
          if (tab.href === href) return tab;
          if (tab.children) {
            const found = findInTabs(tab.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      return findInTabs(tabs);
    },
    [tabs]
  );

  const isTabVisible = useCallback(
    (tabKey: string): boolean => {
      const tab = getTabByKey(tabKey);
      return tab?.visible ?? false;
    },
    [getTabByKey]
  );

  const getTabPath = useCallback(
    (tabKey: string): string[] => {
      const path: string[] = [];

      const findPath = (tabList: ProcessedTab[], targetKey: string, currentPath: string[]): boolean => {
        for (const tab of tabList) {
          const newPath = [...currentPath, tab.key];
          if (tab.key === targetKey) {
            path.push(...newPath);
            return true;
          }
          if (tab.children) {
            if (findPath(tab.children, targetKey, newPath)) {
              return true;
            }
          }
        }
        return false;
      };

      findPath(tabs, tabKey, []);
      return path;
    },
    [tabs]
  );

  const flatTabs = useMemo(() => {
    const flatten = (tabList: ProcessedTab[]): ProcessedTab[] => {
      const result: ProcessedTab[] = [];
      for (const tab of tabList) {
        result.push(tab);
        if (tab.children) {
          result.push(...flatten(tab.children));
        }
      }
      return result;
    };
    return flatten(tabs);
  }, [tabs]);

  return {
    tabs,
    visibleTabs: getVisibleTabs(),
    flatTabs,
    findTabByHref,
    isTabVisible,
    getTabByKey,
    getTabPath,
    permissionContext,
  };
}

/**
 * Hook to manage team expansion states
 */
export function useTeamExpansion() {
  const teamExpansionState = useSettingsStore((state) => state.teamExpansionState);
  const otherTeamExpansionState = useSettingsStore((state) => state.otherTeamExpansionState);
  const setTeamExpanded = useSettingsStore((state) => state.setTeamExpanded);
  const setOtherTeamExpanded = useSettingsStore((state) => state.setOtherTeamExpanded);

  const toggleTeam = useCallback(
    (teamId: string, type: "teams" | "other_teams" = "teams") => {
      if (type === "teams") {
        const currentState = teamExpansionState[teamId] || false;
        setTeamExpanded(teamId, !currentState);
      } else {
        const currentState = otherTeamExpansionState[teamId] || false;
        setOtherTeamExpanded(teamId, !currentState);
      }
    },
    [teamExpansionState, otherTeamExpansionState, setTeamExpanded, setOtherTeamExpanded]
  );

  const expandAllTeams = useCallback(() => {
    Object.keys(teamExpansionState).forEach((teamId) => {
      setTeamExpanded(teamId, true);
    });
    Object.keys(otherTeamExpansionState).forEach((teamId) => {
      setOtherTeamExpanded(teamId, true);
    });
  }, [teamExpansionState, otherTeamExpansionState, setTeamExpanded, setOtherTeamExpanded]);

  const collapseAllTeams = useCallback(() => {
    Object.keys(teamExpansionState).forEach((teamId) => {
      setTeamExpanded(teamId, false);
    });
    Object.keys(otherTeamExpansionState).forEach((teamId) => {
      setOtherTeamExpanded(teamId, false);
    });
  }, [teamExpansionState, otherTeamExpansionState, setTeamExpanded, setOtherTeamExpanded]);

  return {
    teamExpansionState,
    otherTeamExpansionState,
    toggleTeam,
    expandAllTeams,
    collapseAllTeams,
    isTeamExpanded: (teamId: string, type: "teams" | "other_teams" = "teams") =>
      type === "teams" ? teamExpansionState[teamId] || false : otherTeamExpansionState[teamId] || false,
  };
}

/**
 * Hook to check specific permissions
 */
export function useSettingsPermissions() {
  const permissionContext = useSettingsStore((state) => state.permissionContext);

  const hasOrgPermission = useCallback(() => {
    return !!permissionContext?.organizationId;
  }, [permissionContext]);

  const isOrgAdmin = useCallback(() => {
    return permissionContext?.isOrgAdmin || false;
  }, [permissionContext]);

  const isOrgOwner = useCallback(() => {
    return permissionContext?.isOrgOwner || false;
  }, [permissionContext]);

  const isSystemAdmin = useCallback(() => {
    return permissionContext?.isAdmin || false;
  }, [permissionContext]);

  const hasFeature = useCallback(
    (feature: string, teamId?: number) => {
      if (!permissionContext) return false;
      const key = teamId ? `${feature}_${teamId}` : feature;
      return permissionContext.features[key] || false;
    },
    [permissionContext]
  );

  const hasResourcePermission = useCallback(
    (resource: string, action: string) => {
      if (!permissionContext) return false;
      const resourcePerms = permissionContext.resourcePermissions[resource];
      return resourcePerms?.[action as any] || false;
    },
    [permissionContext]
  );

  const canManageTeam = useCallback(
    (teamId: number) => {
      if (!permissionContext) return false;
      const membership = permissionContext.teamMemberships.find((m) => m.id === teamId);
      return membership?.role === "OWNER" || membership?.role === "ADMIN";
    },
    [permissionContext]
  );

  return {
    hasOrgPermission,
    isOrgAdmin,
    isOrgOwner,
    isSystemAdmin,
    hasFeature,
    hasResourcePermission,
    canManageTeam,
    permissionContext,
  };
}