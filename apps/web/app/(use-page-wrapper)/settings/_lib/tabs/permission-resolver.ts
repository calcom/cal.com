import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { HOSTED_CAL_FEATURES, IS_CALCOM } from "@calcom/lib/constants";
import { UserPermissionRole } from "@calcom/prisma/enums";

import type { TabConfig, PermissionContext, ProcessedTab } from "./types";

export class PermissionResolver {
  constructor(private context: PermissionContext) {}

  /**
   * Check if a tab should be visible based on visibility rules
   */
  private checkVisibility(tab: TabConfig): boolean {
    const visibility = tab.visibility;
    if (!visibility) return true;

    // Check organization requirement
    if (visibility.requiresOrg && !this.context.organizationId) {
      return false;
    }

    // Check team requirement
    if (visibility.requiresTeam && this.context.teamMemberships.length === 0) {
      return false;
    }

    // Check hosted/self-hosted requirements
    if (visibility.hostedOnly && !IS_CALCOM) {
      return false;
    }
    if (visibility.selfHostedOnly && HOSTED_CAL_FEATURES) {
      return false;
    }

    // Check identity provider requirements
    if (visibility.requiresIdentityProvider) {
      if (
        !this.context.identityProvider ||
        !visibility.requiresIdentityProvider.includes(this.context.identityProvider)
      ) {
        return false;
      }
    }

    // Check password requirement
    if (visibility.hideIfNoPassword && !this.context.passwordAdded) {
      return false;
    }

    return true;
  }

  /**
   * Check if user has required permissions for a tab
   */
  private checkPermissions(tab: TabConfig): boolean {
    const permissions = tab.permissions;
    if (!permissions) return true;

    // Check admin roles
    if (permissions.roles) {
      const hasRole = permissions.roles.includes(UserPermissionRole.ADMIN) && this.context.isAdmin;
      if (!hasRole) return false;
    }

    // Check organization roles
    if (permissions.orgRoles) {
      const hasOrgRole = permissions.orgRoles.some((role) => {
        if (role === "ADMIN" && this.context.isOrgAdmin) return true;
        if (role === "OWNER" && this.context.isOrgOwner) return true;
        return false;
      });
      if (!hasOrgRole) return false;
    }

    // Check team roles
    if (permissions.teamRoles) {
      const hasTeamRole = this.context.teamMemberships.some((membership) =>
        permissions.teamRoles?.includes(membership.role)
      );
      if (!hasTeamRole) return false;
    }

    // Check feature flags
    if (permissions.features) {
      const hasAllFeatures = permissions.features.every((feature) => this.context.features[feature]);
      if (!hasAllFeatures) return false;
    }

    // Check resource permissions (PBAC)
    if (permissions.resources) {
      const hasAllResourcePermissions = permissions.resources.every(({ resource, action }) => {
        const resourcePerms = this.context.resourcePermissions[resource];
        return resourcePerms && resourcePerms[action];
      });
      if (!hasAllResourcePermissions) return false;
    }

    // Check custom permission function
    if (permissions.custom) {
      if (!permissions.custom(this.context)) return false;
    }

    return true;
  }

  /**
   * Process a tab and its children recursively
   */
  private processTab(tab: TabConfig): ProcessedTab | null {
    // Check visibility and permissions
    const isVisible = this.checkVisibility(tab);
    const hasPermission = this.checkPermissions(tab);

    if (!isVisible || !hasPermission) {
      return null;
    }

    // Process children recursively
    const processedChildren = tab.children
      ?.map((child) => this.processTab(child))
      .filter((child): child is ProcessedTab => child !== null);

    // Resolve avatar if it's a function
    let avatar: string | undefined;
    if (typeof tab.avatar === "function") {
      avatar = tab.avatar(this.context);
    } else {
      avatar = tab.avatar;
    }

    // Resolve href if needed (for dynamic hrefs)
    let href = tab.href;
    if (typeof href === "function") {
      href = href(this.context);
    }

    return {
      key: tab.key,
      name: tab.name,
      href,
      icon: tab.icon,
      avatar,
      children: processedChildren,
      isExternalLink: tab.isExternalLink,
      visible: true,
    };
  }

  /**
   * Process all tabs and filter based on permissions
   */
  public processTabs(tabs: TabConfig[]): ProcessedTab[] {
    return tabs.map((tab) => this.processTab(tab)).filter((tab): tab is ProcessedTab => tab !== null);
  }

  /**
   * Add dynamic team tabs
   */
  public addTeamTabs(tabs: ProcessedTab[], teams: any[]): ProcessedTab[] {
    const teamsTabIndex = tabs.findIndex((tab) => tab.key === "teams");
    if (teamsTabIndex !== -1 && teams) {
      // Create team children
      const teamChildren: ProcessedTab[] = teams.map((team) => ({
        key: `team_${team.id}`,
        name: team.name,
        href: `/settings/teams/${team.id}`,
        visible: true,
        children: this.generateTeamChildren(team),
      }));

      tabs[teamsTabIndex] = {
        ...tabs[teamsTabIndex],
        children: teamChildren,
      };
    }

    return tabs;
  }

  /**
   * Generate children for a specific team
   */
  private generateTeamChildren(team: any): ProcessedTab[] {
    const children: ProcessedTab[] = [];

    if (team.accepted) {
      children.push({
        key: `team_${team.id}_profile`,
        name: "profile",
        href: `/settings/teams/${team.id}/profile`,
        visible: true,
      });
    }

    children.push({
      key: `team_${team.id}_members`,
      name: "members",
      href: `/settings/teams/${team.id}/members`,
      visible: true,
    });

    // Add roles tab for sub-teams with PBAC enabled parent
    if (team.parentId && this.context.features[`pbac_${team.parentId}`]) {
      children.push({
        key: `team_${team.id}_roles`,
        name: "roles_and_permissions",
        href: `/settings/teams/${team.id}/roles`,
        visible: true,
      });
    }

    // Add admin/owner specific tabs
    if (checkAdminOrOwner(team.role) || team.isOrgAdmin) {
      children.push({
        key: `team_${team.id}_appearance`,
        name: "appearance",
        href: `/settings/teams/${team.id}/appearance`,
        visible: true,
      });

      if (!team.parentId) {
        children.push({
          key: `team_${team.id}_billing`,
          name: "billing",
          href: `/settings/teams/${team.id}/billing`,
          visible: true,
        });
      }

      children.push({
        key: `team_${team.id}_settings`,
        name: "settings",
        href: `/settings/teams/${team.id}/settings`,
        visible: true,
      });
    }

    return children;
  }

  /**
   * Add other teams (for org admins)
   */
  public addOtherTeamsTabs(tabs: ProcessedTab[], otherTeams: any[]): ProcessedTab[] {
    const otherTeamsTabIndex = tabs.findIndex((tab) => tab.key === "other_teams");
    if (otherTeamsTabIndex !== -1 && otherTeams) {
      const otherTeamChildren: ProcessedTab[] = otherTeams.map((team) => ({
        key: `other_team_${team.id}`,
        name: team.name,
        href: `/settings/organizations/teams/other/${team.id}`,
        visible: true,
        children: [
          {
            key: `other_team_${team.id}_profile`,
            name: "profile",
            href: `/settings/organizations/teams/other/${team.id}/profile`,
            visible: true,
          },
          {
            key: `other_team_${team.id}_members`,
            name: "members",
            href: `/settings/organizations/teams/other/${team.id}/members`,
            visible: true,
          },
        ],
      }));

      tabs[otherTeamsTabIndex] = {
        ...tabs[otherTeamsTabIndex],
        children: otherTeamChildren,
      };
    }

    return tabs;
  }
}
