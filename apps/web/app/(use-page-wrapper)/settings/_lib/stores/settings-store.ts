import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { PermissionResolver } from "../tabs/permission-resolver";
import { SETTINGS_TABS } from "../tabs/tab-registry";
import type { ProcessedTab, PermissionContext } from "../tabs/types";

interface TeamExpansionState {
  [teamId: string]: boolean;
}

interface SettingsStore {
  // State
  tabs: ProcessedTab[];
  teamExpansionState: TeamExpansionState;
  otherTeamExpansionState: TeamExpansionState;
  permissionContext: PermissionContext | null;
  isInitialized: boolean;

  // Actions
  initializeTabs: (context: PermissionContext, teams?: any[], otherTeams?: any[]) => void;
  setTeamExpanded: (teamId: string, expanded: boolean) => void;
  setOtherTeamExpanded: (teamId: string, expanded: boolean) => void;
  refreshTabs: () => void;
  getTabByKey: (key: string) => ProcessedTab | undefined;
  getVisibleTabs: () => ProcessedTab[];
  updatePermissionContext: (context: Partial<PermissionContext>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      tabs: [],
      teamExpansionState: {},
      otherTeamExpansionState: {},
      permissionContext: null,
      isInitialized: false,

      // Initialize tabs with permission context
      initializeTabs: (context, teams, otherTeams) => {
        const resolver = new PermissionResolver(context);
        let processedTabs = resolver.processTabs(SETTINGS_TABS);

        // Add dynamic team tabs
        if (teams) {
          processedTabs = resolver.addTeamTabs(processedTabs, teams);

          // Initialize expansion state based on URL params if needed
          const teamExpansion: TeamExpansionState = {};
          teams.forEach((team) => {
            teamExpansion[team.id] = false; // Default to collapsed
          });

          set({ teamExpansionState: teamExpansion });
        }

        // Add other teams for org admins
        if (otherTeams && (context.isOrgAdmin || context.isOrgOwner)) {
          processedTabs = resolver.addOtherTeamsTabs(processedTabs, otherTeams);

          const otherTeamExpansion: TeamExpansionState = {};
          otherTeams.forEach((team) => {
            otherTeamExpansion[team.id] = false;
          });

          set({ otherTeamExpansionState: otherTeamExpansion });
        }

        // Update user account tab with actual user data
        const myAccountTab = processedTabs.find((tab) => tab.key === "my_account");
        if (myAccountTab && context.userId) {
          // This will be populated with actual user data from the context
          myAccountTab.name = "my_account"; // Will be replaced with actual name in component
        }

        // Update organization tab with org data
        const orgTab = processedTabs.find((tab) => tab.key === "organization");
        if (orgTab && context.organizationId) {
          // This will be populated with actual org data from the context
          orgTab.name = "organization"; // Will be replaced with actual name in component
        }

        set({
          tabs: processedTabs,
          permissionContext: context,
          isInitialized: true,
        });
      },

      // Toggle team expansion
      setTeamExpanded: (teamId, expanded) => {
        set((state) => ({
          teamExpansionState: {
            ...state.teamExpansionState,
            [teamId]: expanded,
          },
        }));
      },

      // Toggle other team expansion
      setOtherTeamExpanded: (teamId, expanded) => {
        set((state) => ({
          otherTeamExpansionState: {
            ...state.otherTeamExpansionState,
            [teamId]: expanded,
          },
        }));
      },

      // Refresh tabs with current context
      refreshTabs: () => {
        const { permissionContext } = get();
        if (!permissionContext) return;

        const resolver = new PermissionResolver(permissionContext);
        const processedTabs = resolver.processTabs(SETTINGS_TABS);

        set({ tabs: processedTabs });
      },

      // Get a specific tab by key
      getTabByKey: (key) => {
        const { tabs } = get();

        const findTab = (tabList: ProcessedTab[], targetKey: string): ProcessedTab | undefined => {
          for (const tab of tabList) {
            if (tab.key === targetKey) return tab;
            if (tab.children) {
              const found = findTab(tab.children, targetKey);
              if (found) return found;
            }
          }
          return undefined;
        };

        return findTab(tabs, key);
      },

      // Get only visible tabs
      getVisibleTabs: () => {
        const { tabs } = get();
        return tabs.filter((tab) => tab.visible);
      },

      // Update permission context and refresh tabs
      updatePermissionContext: (partialContext) => {
        set((state) => {
          if (!state.permissionContext) return state;

          const newContext = {
            ...state.permissionContext,
            ...partialContext,
          };

          const resolver = new PermissionResolver(newContext);
          const processedTabs = resolver.processTabs(SETTINGS_TABS);

          return {
            permissionContext: newContext,
            tabs: processedTabs,
          };
        });
      },
    }),
    {
      name: "settings-store",
    }
  )
);
