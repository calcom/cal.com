"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import React, { useEffect, useState, useMemo } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import type { OrganizationBranding } from "@calcom/features/ee/organizations/context/provider";
import {
  HAS_ORG_OPT_IN_FEATURES,
  HAS_TEAM_OPT_IN_FEATURES,
  HAS_USER_OPT_IN_FEATURES,
} from "@calcom/features/feature-opt-in/config";
import type { TeamFeatures } from "@calcom/features/flags/config";
import { useIsFeatureEnabledForTeam } from "@calcom/features/flags/hooks/useIsFeatureEnabledForTeam";
import { HOSTED_CAL_FEATURES, IS_CALCOM, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useIsStandalone } from "@calcom/lib/hooks/useIsStandalone";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";
import { Icon } from "@calcom/ui/components/icon";
import type { VerticalTabItemProps } from "@calcom/ui/components/navigation";
import { VerticalTabItem } from "@calcom/ui/components/navigation";
import { Skeleton } from "@calcom/ui/components/skeleton";

import Shell from "~/shell/Shell";

const getTabs = (orgBranding: OrganizationBranding | null) => {
  const tabs: VerticalTabItemProps[] = [
    {
      name: "my_account",
      href: "/settings/my-account",
      icon: "user",
      children: [
        {
          name: "profile",
          href: "/settings/my-account/profile",
          trackingMetadata: { section: "my_account", page: "profile" },
        },
        {
          name: "general",
          href: "/settings/my-account/general",
          trackingMetadata: { section: "my_account", page: "general" },
        },
        {
          name: "calendars",
          href: "/settings/my-account/calendars",
          trackingMetadata: { section: "my_account", page: "calendars" },
        },
        {
          name: "conferencing",
          href: "/settings/my-account/conferencing",
          trackingMetadata: { section: "my_account", page: "conferencing" },
        },
        {
          name: "appearance",
          href: "/settings/my-account/appearance",
          trackingMetadata: { section: "my_account", page: "appearance" },
        },
        {
          name: "out_of_office",
          href: "/settings/my-account/out-of-office",
          trackingMetadata: { section: "my_account", page: "out_of_office" },
        },
        {
          name: "push_notifications",
          href: "/settings/my-account/push-notifications",
          trackingMetadata: { section: "my_account", page: "push_notifications" },
        },
        ...(HAS_USER_OPT_IN_FEATURES
          ? [
              {
                name: "features",
                href: "/settings/my-account/features",
                trackingMetadata: { section: "my_account", page: "features" },
              },
            ]
          : []),
        // TODO
        // { name: "referrals", href: "/settings/my-account/referrals" },
      ],
    },
    {
      name: "security",
      href: "/settings/security",
      icon: "key",
      children: [
        {
          name: "password",
          href: "/settings/security/password",
          trackingMetadata: { section: "security", page: "password" },
        },
        {
          name: "impersonation",
          href: "/settings/security/impersonation",
          trackingMetadata: { section: "security", page: "impersonation" },
        },
        {
          name: "2fa_auth",
          href: "/settings/security/two-factor-auth",
          trackingMetadata: { section: "security", page: "2fa_auth" },
        },
        {
          name: "compliance",
          href: "/settings/security/compliance",
          trackingMetadata: { section: "security", page: "compliance" },
        },
      ],
    },
    {
      name: "billing",
      href: "/settings/billing",
      icon: "credit-card",
      children: [
        {
          name: "manage_billing",
          href: "/settings/billing",
          trackingMetadata: { section: "billing", page: "manage_billing" },
        },
      ],
    },
    {
      name: "developer",
      href: "/settings/developer",
      icon: "terminal",
      children: [
        //
        {
          name: "webhooks",
          href: "/settings/developer/webhooks",
          trackingMetadata: { section: "developer", page: "webhooks" },
        },
        {
          name: "oAuth",
          href: "/settings/developer/oauth",
          trackingMetadata: { section: "developer", page: "oauth_clients" },
        },
        {
          name: "api_keys",
          href: "/settings/developer/api-keys",
          trackingMetadata: { section: "developer", page: "api_keys" },
        },
        {
          name: "admin_api",
          href: "/settings/organizations/admin-api",
          trackingMetadata: { section: "developer", page: "admin_api" },
        },
        // TODO: Add profile level for embeds
        // { name: "embeds", href: "/v2/settings/developer/embeds" },
      ],
    },
    {
      name: "organization",
      href: "/settings/organizations",
      children: [
        {
          name: "profile",
          href: "/settings/organizations/profile",
          trackingMetadata: { section: "organization", page: "profile" },
        },
        {
          name: "general",
          href: "/settings/organizations/general",
          trackingMetadata: { section: "organization", page: "general" },
        },
        {
          name: "guest_notifications",
          href: "/settings/organizations/guest-notifications",
        },
        ...(orgBranding
          ? [
              {
                name: "members",
                href: `${WEBAPP_URL}/settings/organizations/${orgBranding.slug}/members`,
                isExternalLink: true,
                trackingMetadata: { section: "organization", page: "members" },
              },
            ]
          : []),
        {
          name: "privacy_and_security",
          href: "/settings/organizations/privacy",
          trackingMetadata: { section: "organization", page: "privacy_and_security" },
        },
        {
          name: "SSO",
          href: "/settings/organizations/sso",
          trackingMetadata: { section: "organization", page: "sso" },
        },
        {
          name: "directory_sync",
          href: "/settings/organizations/dsync",
          trackingMetadata: { section: "organization", page: "directory_sync" },
        },
        {
          name: "admin_api",
          href: "https://cal.com/docs/enterprise-features/api/api-reference/bookings#admin-access",
          isExternalLink: true,
          trackingMetadata: { section: "organization", page: "admin_api" },
        },
        ...(HAS_ORG_OPT_IN_FEATURES
          ? [
              {
                name: "features",
                href: "/settings/organizations/features",
                trackingMetadata: { section: "organization", page: "features" },
              },
            ]
          : []),
      ],
    },
    {
      name: "teams",
      href: "/teams",
      icon: "users",
      children: [],
    },
    {
      name: "other_teams",
      href: "/settings/organizations/teams/other",
      icon: "users",
      children: [],
    },
    {
      name: "admin",
      href: "/settings/admin",
      icon: "lock",
      children: [
        //
        {
          name: "features",
          href: "/settings/admin/flags",
          trackingMetadata: { section: "admin", page: "features" },
        },
        {
          name: "license",
          href: "/auth/setup?step=1",
          trackingMetadata: { section: "admin", page: "license" },
        },
        {
          name: "admin_billing",
          href: "/settings/admin/billing",
          trackingMetadata: { section: "admin", page: "billing" },
        },
        {
          name: "impersonation",
          href: "/settings/admin/impersonation",
          trackingMetadata: { section: "admin", page: "impersonation" },
        },
        {
          name: "apps",
          href: "/settings/admin/apps/calendar",
          trackingMetadata: { section: "admin", page: "apps" },
        },
        {
          name: "users",
          href: "/settings/admin/users",
          trackingMetadata: { section: "admin", page: "users" },
        },
        {
          name: "organizations",
          href: "/settings/admin/organizations",
          trackingMetadata: { section: "admin", page: "organizations" },
        },
        {
          name: "lockedSMS",
          href: "/settings/admin/lockedSMS",
          trackingMetadata: { section: "admin", page: "locked_sms" },
        },
        {
          name: "pbac_resource_blocklist",
          href: "/settings/admin/blocklist",
          trackingMetadata: { section: "admin", page: "blocklist" },
        },
        {
          name: "oAuth",
          href: "/settings/admin/oauth",
          trackingMetadata: { section: "admin", page: "oauth" },
        },
        {
          name: "Workspace Platforms",
          href: "/settings/admin/workspace-platforms",
          trackingMetadata: { section: "admin", page: "workspace_platforms" },
        },
        {
          name: "Playground",
          href: "/settings/admin/playground",
          trackingMetadata: { section: "admin", page: "playground" },
        },
      ],
    },
  ];

  for (const tab of tabs) {
    if (tab.name === "security" && !HOSTED_CAL_FEATURES) {
      tab.children?.push({
        name: "sso_configuration",
        href: "/settings/security/sso",
        trackingMetadata: { section: "security", page: "sso_configuration" },
      });
      // TODO: Enable dsync for self hosters
      // tab.children?.push({ name: "directory_sync", href: "/settings/security/dsync" });
    }

    if (tab.name === "admin" && IS_CALCOM) {
      tab.children?.push({
        name: "create_org",
        href: "/settings/organizations/new",
        trackingMetadata: { section: "admin", page: "create_org" },
      });

      tab.children?.push({
        name: "create_license_key",
        href: "/settings/license-key/new",
        trackingMetadata: { section: "admin", page: "create_license_key" },
      });
    }
  }

  return tabs;
};

// The following keys are assigned to admin only
const adminRequiredKeys = ["admin"];
const organizationRequiredKeys = ["organization"];
const organizationAdminKeys = [
  "privacy",
  "privacy_and_security",
  "SSO",
  "directory_sync",
  "delegation_credential",
];

interface SettingsPermissions {
  canViewRoles?: boolean;
  canViewOrganizationBilling?: boolean;
  canUpdateOrganization?: boolean;
  canViewAttributes?: boolean;
}

const useTabs = ({
  isDelegationCredentialEnabled,
  isPbacEnabled,
  permissions,
}: {
  isDelegationCredentialEnabled: boolean;
  isPbacEnabled: boolean;
  permissions?: SettingsPermissions;
}) => {
  const session = useSession();
  const { data: user } = trpc.viewer.me.get.useQuery({ includePasswordAdded: true });
  const orgBranding = useOrgBranding();
  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;

  const processTabsMemod = useMemo(() => {
    const processedTabs = getTabs(orgBranding).map((tab) => {
      if (tab.href === "/settings/my-account") {
        return {
          ...tab,
          name: user?.name || "my_account",
          icon: undefined,
          avatar: getUserAvatarUrl(user),
        };
      } else if (tab.href === "/settings/organizations") {
        const newArray = (tab?.children ?? []).filter(
          (child) => permissions?.canUpdateOrganization || !organizationAdminKeys.includes(child.name)
        );

        if (permissions?.canViewAttributes) {
          newArray.splice(4, 0, {
            name: "attributes",
            href: "/settings/organizations/attributes",
            trackingMetadata: { section: "organization", page: "attributes" },
          });
        }

        // Add delegation-credential menu item only if feature flag is enabled
        if (isDelegationCredentialEnabled) {
          newArray.push({
            name: "delegation_credential",
            href: "/settings/organizations/delegation-credential",
            trackingMetadata: { section: "organization", page: "delegation_credential" },
          });
        }

        // Add pbac menu item - show opt-in page if not enabled, regular page if enabled
        if (isPbacEnabled) {
          if (permissions?.canViewRoles) {
            newArray.push({
              name: "roles_and_permissions",
              href: "/settings/organizations/roles",
              trackingMetadata: { section: "organization", page: "roles_and_permissions" },
            });
          }

          if (permissions?.canViewOrganizationBilling) {
            newArray.push({
              name: "billing",
              href: "/settings/organizations/billing",
              trackingMetadata: { section: "organization", page: "billing" },
            });
          }
        } else {
          if (permissions?.canUpdateOrganization) {
            newArray.push({
              name: "billing",
              href: "/settings/organizations/billing",
              trackingMetadata: { section: "organization", page: "billing" },
            });
          }
          // Show roles page (modal will appear if PBAC not enabled)
          if (permissions?.canUpdateOrganization) {
            newArray.push({
              name: "roles",
              href: "/settings/organizations/roles",
              isBadged: true, // Show "New" badge,
              trackingMetadata: { section: "organization", page: "roles" },
            });
          }
        }

        return {
          ...tab,
          children: newArray,
          name: orgBranding?.name || "organization",
          avatar: getPlaceholderAvatar(orgBranding?.logoUrl, orgBranding?.name),
        };
      } else if (
        tab.href === "/settings/security" &&
        user?.identityProvider === IdentityProvider.GOOGLE &&
        !user?.twoFactorEnabled &&
        !user?.passwordAdded
      ) {
        const filtered = tab?.children?.filter(
          (childTab) => childTab.href !== "/settings/security/two-factor-auth"
        );
        return { ...tab, children: filtered };
      } else if (tab.href === "/settings/developer") {
        const filtered = tab?.children?.filter(
          (childTab) => permissions?.canUpdateOrganization || childTab.name !== "admin_api"
        );
        return { ...tab, children: filtered };
      }
      return tab;
    });

    // check if name is in adminRequiredKeys
    return processedTabs.filter((tab) => {
      if (organizationRequiredKeys.includes(tab.name)) return !!orgBranding;
      if (tab.name === "other_teams" && !permissions?.canUpdateOrganization) return false;

      if (isAdmin) return true;
      return !adminRequiredKeys.includes(tab.name);
    });
  }, [isAdmin, orgBranding, user, isDelegationCredentialEnabled, isPbacEnabled, permissions]);

  return processTabsMemod;
};

const BackButtonInSidebar = ({ name }: { name: string }) => {
  return (
    <Link
      href="/event-types"
      className="hover:bg-subtle todesktop:mt-10 [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default text-emphasis group my-6 flex h-6 max-h-6 w-full flex-row items-center rounded-md px-3 py-2 text-sm font-medium leading-4 transition"
      data-testid={`vertical-tab-${name}`}>
      <Icon
        name="arrow-left"
        className="h-4 w-4 stroke-[2px] ltr:mr-[10px] rtl:ml-[10px] rtl:rotate-180 md:mt-0"
      />
      <Skeleton title={name} as="p" className="min-h-4 max-w-36 truncate" loadingClassName="ms-3">
        {name}
      </Skeleton>
    </Link>
  );
};

interface SettingsSidebarContainerProps {
  className?: string;
  navigationIsOpenedOnMobile?: boolean;
  bannersHeight?: number;
  teamFeatures?: Record<number, TeamFeatures>;
  permissions?: SettingsPermissions;
}

const TeamRolesNavItem = ({
  team,
  teamFeatures,
}: {
  team: { id: number; parentId?: number | null };
  teamFeatures?: Record<number, TeamFeatures>;
}) => {
  const { t } = useLocale();

  // Always call the hook first (Rules of Hooks)
  const isPbacEnabled = useIsFeatureEnabledForTeam({
    teamFeatures,
    teamId: team.parentId || 0, // Use 0 as fallback when no parentId
    feature: "pbac",
  });

  // Only show for sub-teams (teams with parentId) AND when parent has PBAC enabled
  if (!team.parentId || !isPbacEnabled) return null;

  return (
    <VerticalTabItem
      name={t("roles_and_permissions")}
      href={`/settings/teams/${team.id}/roles`}
      trackingMetadata={{ section: "team", page: "roles_and_permissions", teamId: team.id }}
      textClassNames="px-3 text-emphasis font-medium text-sm"
      disableChevron
    />
  );
};

const TeamListCollapsible = ({ teamFeatures }: { teamFeatures?: Record<number, TeamFeatures> }) => {
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { t } = useLocale();
  const [teamMenuState, setTeamMenuState] =
    useState<{ teamId: number | undefined; teamMenuOpen: boolean }[]>();
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const searchParamsId = searchParams?.get("id");
  const pathTeamId = pathname?.match(/\/settings\/teams\/(\d+)/)?.[1];
  const activeTeamId = pathTeamId || searchParamsId;

  useEffect(() => {
    if (teams) {
      const teamStates = teams?.map((team) => ({
        teamId: team.id,
        teamMenuOpen: String(team.id) === activeTeamId,
      }));
      setTeamMenuState(teamStates);
      if (activeTeamId) {
        setTimeout(() => {
          const teamTrigger = document.querySelector(`[aria-controls="team-content-${activeTeamId}"]`);
          teamTrigger?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [activeTeamId, teams]);

  return (
    <>
      {teams &&
        teamMenuState &&
        teams.map((team, index: number) => {
          if (!teamMenuState[index]) {
            return null;
          }
          if (teamMenuState.some((teamState) => teamState.teamId === team.id)) {
            return (
              <Collapsible
                className="cursor-pointer"
                key={team.id}
                open={teamMenuState[index].teamMenuOpen}
                onOpenChange={(open) => {
                  const newTeamMenuState = [...teamMenuState];
                  newTeamMenuState[index] = {
                    ...newTeamMenuState[index],
                    teamMenuOpen: open,
                  };
                  setTeamMenuState(newTeamMenuState);
                }}>
                <CollapsibleTrigger asChild>
                  <button
                    className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-left text-sm font-medium leading-none transition"
                    aria-controls={`team-content-${team.id}`}
                    aria-expanded={teamMenuState[index].teamMenuOpen}
                    onClick={() => {
                      const newTeamMenuState = [...teamMenuState];
                      newTeamMenuState[index] = {
                        ...newTeamMenuState[index],
                        teamMenuOpen: !teamMenuState[index].teamMenuOpen,
                      };
                      setTeamMenuState(newTeamMenuState);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        const newTeamMenuState = [...teamMenuState];
                        newTeamMenuState[index] = {
                          ...newTeamMenuState[index],
                          teamMenuOpen: !teamMenuState[index].teamMenuOpen,
                        };
                        setTeamMenuState(newTeamMenuState);
                      }
                    }}
                    aria-label={`${team.name} ${
                      teamMenuState[index].teamMenuOpen ? t("collapse_menu") : t("expand_menu")
                    }`}>
                    <div className="me-3">
                      {teamMenuState[index].teamMenuOpen ? (
                        <Icon name="chevron-down" className="h-4 w-4" />
                      ) : (
                        <Icon name="chevron-right" className="h-4 w-4" />
                      )}
                    </div>
                    {}
                    {!team.parentId && (
                      <Image
                        src={getPlaceholderAvatar(team.logoUrl, team.name)}
                        width={16}
                        height={16}
                        className="self-start rounded-full stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0"
                        alt={team.name || "Team logo"}
                      />
                    )}
                    <p className="w-1/2 truncate leading-normal">{team.name}</p>
                    {!team.accepted && (
                      <Badge className="ms-3" variant="orange">
                        Inv.
                      </Badge>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col space-y-1" id={`team-content-${team.id}`}>
                  {team.accepted && (
                    <VerticalTabItem
                      name={t("profile")}
                      href={`/settings/teams/${team.id}/profile`}
                      trackingMetadata={{ section: "team", page: "profile", teamId: team.id }}
                      textClassNames="px-3 text-emphasis font-medium text-sm"
                      className="px-2! me-5 h-7 w-auto"
                      disableChevron
                    />
                  )}
                  <VerticalTabItem
                    name={t("members")}
                    href={`/settings/teams/${team.id}/members`}
                    trackingMetadata={{ section: "team", page: "members", teamId: team.id }}
                    textClassNames="px-3 text-emphasis font-medium text-sm"
                    className="px-2! me-5 h-7 w-auto"
                    disableChevron
                  />
                  {/* Show roles only for sub-teams with PBAC-enabled parent */}
                  <TeamRolesNavItem team={team} teamFeatures={teamFeatures} />
                  {(checkAdminOrOwner(team.role) ||
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore this exists wtf?
                    (team.isOrgAdmin && team.isOrgAdmin)) && (
                    <>
                      {/* TODO */}
                      {/* <VerticalTabItem
                name={t("general")}
                href={`${WEBAPP_URL}/settings/my-account/appearance`}
                textClassNames="px-3 text-emphasis font-medium text-sm"
                disableChevron
              /> */}
                      <VerticalTabItem
                        name={t("appearance")}
                        href={`/settings/teams/${team.id}/appearance`}
                        textClassNames="px-3 text-emphasis font-medium text-sm"
                        trackingMetadata={{ section: "team", page: "appearance", teamId: team.id }}
                        className="px-2! me-5 h-7 w-auto"
                        disableChevron
                      />
                      {HAS_TEAM_OPT_IN_FEATURES && (
                        <VerticalTabItem
                          name={t("features")}
                          href={`/settings/teams/${team.id}/features`}
                          textClassNames="px-3 text-emphasis font-medium text-sm"
                          trackingMetadata={{ section: "team", page: "features", teamId: team.id }}
                          className="px-2! me-5 h-7 w-auto"
                          disableChevron
                        />
                      )}
                      {/* Hide if there is a parent ID */}
                      {!team.parentId ? (
                        <>
                          <VerticalTabItem
                            name={t("billing")}
                            href={`/settings/teams/${team.id}/billing`}
                            textClassNames="px-3 text-emphasis font-medium text-sm"
                            trackingMetadata={{ section: "team", page: "billing", teamId: team.id }}
                            className="px-2! me-5 h-7 w-auto"
                            disableChevron
                          />
                        </>
                      ) : null}
                      <VerticalTabItem
                        name={t("settings")}
                        href={`/settings/teams/${team.id}/settings`}
                        textClassNames="px-3 text-emphasis font-medium text-sm"
                        trackingMetadata={{ section: "team", page: "settings", teamId: team.id }}
                        className="px-2! me-5 h-7 w-auto"
                        disableChevron
                      />
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return null;
        })}
    </>
  );
};

const SettingsSidebarContainer = ({
  className = "",
  navigationIsOpenedOnMobile,
  bannersHeight,
  teamFeatures,
  permissions,
}: SettingsSidebarContainerProps) => {
  const searchParams = useCompatSearchParams();
  const orgBranding = useOrgBranding();
  const { t } = useLocale();
  const [otherTeamMenuState, setOtherTeamMenuState] =
    useState<
      {
        teamId: number | undefined;
        teamMenuOpen: boolean;
      }[]
    >();
  const session = useSession();

  const organizationId = session.data?.user?.org?.id;

  const isDelegationCredentialEnabled = useIsFeatureEnabledForTeam({
    teamFeatures,
    teamId: organizationId,
    feature: "delegation-credential",
  });

  const isPbacEnabled = useIsFeatureEnabledForTeam({
    teamFeatures,
    teamId: organizationId,
    feature: "pbac",
  });

  const tabsWithPermissions = useTabs({
    isDelegationCredentialEnabled,
    isPbacEnabled,
    permissions,
  });

  const { data: otherTeams } = trpc.viewer.organizations.listOtherTeams.useQuery(undefined, {
    enabled: !!session.data?.user?.org,
  });

  const searchParamsId = searchParams?.get("id");
  // Same as above but for otherTeams
  useEffect(() => {
    if (otherTeams) {
      const otherTeamStates = otherTeams?.map((team) => ({
        teamId: team.id,
        teamMenuOpen: String(team.id) === searchParamsId,
      }));
      setOtherTeamMenuState(otherTeamStates);
      setTimeout(() => {
        // @TODO: test if this works for 2 dataset testids
        const tabMembers = Array.from(document.getElementsByTagName("a")).filter(
          (bottom) => bottom.dataset.testid === "vertical-tab-Members"
        )[1];
        tabMembers?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [searchParamsId, otherTeams]);

  return (
    <nav
      style={{ maxHeight: `calc(100vh - ${bannersHeight}px)`, top: `${bannersHeight}px` }}
      className={classNames(
        "no-scrollbar bg-cal-muted stack-y-1 fixed bottom-0 left-0 top-0 z-20 flex max-h-screen w-56 flex-col overflow-x-hidden overflow-y-scroll px-2 pb-3 transition-transform max-lg:z-10 lg:sticky lg:flex",
        className,
        navigationIsOpenedOnMobile
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
      )}
      aria-label={t("settings_navigation")}>
      <>
        <BackButtonInSidebar name={t("back")} />
        {tabsWithPermissions.map((tab) => {
          return (
            <React.Fragment key={tab.href}>
              {!["teams", "other_teams"].includes(tab.name) && (
                <React.Fragment key={tab.href}>
                  <div className={`${!tab.children?.length ? "mb-3!" : ""}`}>
                    <div className="[&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default group flex h-7 w-full flex-row items-center rounded-md px-2 text-sm font-medium leading-none">
                      {tab && tab.icon && (
                        <Icon
                          name={tab.icon}
                          className="text-subtle h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0"
                        />
                      )}
                      {}
                      {!tab.icon && tab?.avatar && (
                        <Image
                          width={16}
                          height={16}
                          className="rounded-full ltr:mr-3 rtl:ml-3"
                          src={tab?.avatar}
                          alt="Organization Logo"
                        />
                      )}
                      <Skeleton
                        title={tab.name}
                        as="p"
                        className="text-subtle truncate text-sm font-medium leading-5"
                        loadingClassName="ms-3">
                        {t(tab.name)}
                      </Skeleton>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    {tab.children?.map((child, index) => (
                      <div key={child.href} className="flex items-start gap-2">
                        <VerticalTabItem
                          name={t(child.name)}
                          isExternalLink={child.isExternalLink}
                          href={child.href || "/"}
                          trackingMetadata={child.trackingMetadata}
                          textClassNames="text-emphasis font-medium text-sm"
                          className={`px-2! py-1! min-h-7 h-auto w-fit ${
                            tab.children && index === tab.children?.length - 1 && "mb-3!"
                          }`}
                          disableChevron
                        />
                        {child.isBadged && (
                          <Badge variant="blue" className="mt-0.5 text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              )}

              {tab.name === "teams" && (
                <React.Fragment key={tab.href}>
                  <div data-testid="tab-teams" className={`${!tab.children?.length ? "mb-3" : ""}`}>
                    <Link href={tab.href}>
                      <div className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default text-default group flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-sm font-medium leading-none transition">
                        {tab && tab.icon && (
                          <Icon
                            name={tab.icon}
                            className="text-subtle h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0"
                          />
                        )}
                        <Skeleton
                          title={tab.name}
                          as="p"
                          className="text-subtle truncate text-sm font-medium leading-5"
                          loadingClassName="ms-3">
                          {t("my_teams")}
                        </Skeleton>
                      </div>
                    </Link>
                    <TeamListCollapsible teamFeatures={teamFeatures} />
                    {(!orgBranding?.id || permissions?.canUpdateOrganization) && (
                      <VerticalTabItem
                        name={t("add_a_team")}
                        href={`${WEBAPP_URL}/settings/teams/new`}
                        trackingMetadata={{ section: "team", page: "add_a_team" }}
                        textClassNames="px-3 items-center mt-2 text-emphasis font-medium text-sm"
                        className="px-2! me-5 h-7 w-auto"
                        icon="plus"
                        disableChevron
                      />
                    )}
                  </div>
                </React.Fragment>
              )}

              {tab.name === "other_teams" && (
                <React.Fragment key={tab.href}>
                  <div className={`${!tab.children?.length ? "mb-3" : ""}`}>
                    <Link href={tab.href}>
                      <div className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default text-default group flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-sm font-medium leading-none transition">
                        {tab && tab.icon && (
                          <Icon
                            name={tab.icon}
                            className="text-subtle h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0"
                          />
                        )}
                        <Skeleton
                          title={t("org_admin_other_teams")}
                          as="p"
                          className="text-subtle truncate text-sm font-medium leading-5"
                          loadingClassName="ms-3">
                          {t("org_admin_other_teams")}
                        </Skeleton>
                      </div>
                    </Link>
                    {otherTeams &&
                      otherTeamMenuState &&
                      otherTeams.map((otherTeam, index: number) => {
                        if (!otherTeamMenuState[index]) {
                          return null;
                        }
                        if (otherTeamMenuState.some((teamState) => teamState.teamId === otherTeam.id))
                          return (
                            <Collapsible
                              className="cursor-pointer"
                              key={otherTeam.id}
                              open={otherTeamMenuState[index].teamMenuOpen}
                              onOpenChange={(open) => {
                                const newOtherTeamMenuState = [...otherTeamMenuState];
                                newOtherTeamMenuState[index] = {
                                  ...newOtherTeamMenuState[index],
                                  teamMenuOpen: open,
                                };
                                setOtherTeamMenuState(newOtherTeamMenuState);
                              }}>
                              <CollapsibleTrigger asChild>
                                <button
                                  className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-left text-sm font-medium leading-none transition"
                                  aria-controls={`other-team-content-${otherTeam.id}`}
                                  aria-expanded={otherTeamMenuState[index].teamMenuOpen}
                                  onClick={() => {
                                    const newOtherTeamMenuState = [...otherTeamMenuState];
                                    newOtherTeamMenuState[index] = {
                                      ...newOtherTeamMenuState[index],
                                      teamMenuOpen: !otherTeamMenuState[index].teamMenuOpen,
                                    };
                                    setOtherTeamMenuState(newOtherTeamMenuState);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      const newOtherTeamMenuState = [...otherTeamMenuState];
                                      newOtherTeamMenuState[index] = {
                                        ...newOtherTeamMenuState[index],
                                        teamMenuOpen: !otherTeamMenuState[index].teamMenuOpen,
                                      };
                                      setOtherTeamMenuState(newOtherTeamMenuState);
                                    }
                                  }}
                                  aria-label={`${otherTeam.name} ${
                                    otherTeamMenuState[index].teamMenuOpen
                                      ? t("collapse_menu")
                                      : t("expand_menu")
                                  }`}>
                                  <div className="me-3">
                                    {otherTeamMenuState[index].teamMenuOpen ? (
                                      <Icon name="chevron-down" className="h-4 w-4" />
                                    ) : (
                                      <Icon name="chevron-right" className="h-4 w-4" />
                                    )}
                                  </div>
                                  {}
                                  {!otherTeam.parentId && (
                                    <Image
                                      src={getPlaceholderAvatar(otherTeam.logoUrl, otherTeam.name)}
                                      width={16}
                                      height={16}
                                      className="self-start rounded-full stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0"
                                      alt={otherTeam.name || "Team logo"}
                                    />
                                  )}
                                  <p className="w-1/2 truncate leading-normal">{otherTeam.name}</p>
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent
                                className="flex flex-col space-y-1"
                                id={`other-team-content-${otherTeam.id}`}>
                                <VerticalTabItem
                                  name={t("profile")}
                                  href={`/settings/organizations/teams/other/${otherTeam.id}/profile`}
                                  trackingMetadata={{
                                    section: "other_team",
                                    page: "profile",
                                    teamId: otherTeam.id,
                                  }}
                                  textClassNames="px-3 text-emphasis font-medium text-sm"
                                  className="px-2! me-5 h-7 w-auto"
                                  disableChevron
                                />
                                <VerticalTabItem
                                  name={t("members")}
                                  href={`/settings/organizations/teams/other/${otherTeam.id}/members`}
                                  trackingMetadata={{
                                    section: "other_team",
                                    page: "members",
                                    teamId: otherTeam.id,
                                  }}
                                  textClassNames="px-3 text-emphasis font-medium text-sm"
                                  className="px-2! me-5 h-7 w-auto"
                                  disableChevron
                                />
                                <>
                                  {/* TODO: enable appearance edit */}
                                  {/* <VerticalTabItem
                                      name={t("appearance")}
                                      href={`/settings/organizations/teams/other/${otherTeam.id}/appearance`}
                                      textClassNames="px-3 text-emphasis font-medium text-sm"
                                      disableChevron
                                    /> */}
                                </>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                      })}
                  </div>
                </React.Fragment>
              )}
            </React.Fragment>
          );
        })}
      </>
    </nav>
  );
};

const MobileSettingsContainer = (props: { onSideContainerOpen?: () => void }) => {
  const { t } = useLocale();
  const router = useRouter();
  const isStandalone = useIsStandalone();

  if (isStandalone) return null;

  return (
    <>
      <nav className="bg-cal-muted border-muted sticky top-0 z-20 flex w-full items-center justify-between border-b px-2 py-2 sm:relative lg:hidden">
        <div className="flex items-center space-x-3">
          <Button StartIcon="menu" color="minimal" variant="icon" onClick={props.onSideContainerOpen}>
            <span className="sr-only">{t("show_navigation")}</span>
          </Button>

          <button
            className="hover:bg-emphasis flex items-center space-x-2 rounded-md px-3 py-1 rtl:space-x-reverse"
            onClick={() => router.back()}>
            <Icon name="arrow-left" className="text-default h-4 w-4" />
            <p className="text-emphasis font-semibold">{t("settings")}</p>
          </button>
        </div>
      </nav>
    </>
  );
};

type SettingsLayoutProps = {
  children: React.ReactNode;
  containerClassName?: string;
  teamFeatures?: Record<number, TeamFeatures>;
  permissions?: SettingsPermissions;
} & ComponentProps<typeof Shell>;

function SettingsLayoutAppDirClient({ children, teamFeatures, permissions, ...rest }: SettingsLayoutProps) {
  const pathname = usePathname();
  const state = useState(false);
  const [sideContainerOpen, setSideContainerOpen] = state;

  useEffect(() => {
    const closeSideContainer = () => {
      if (window.innerWidth >= 1024) {
        setSideContainerOpen(false);
      }
    };

    window.addEventListener("resize", closeSideContainer);
    return () => {
      window.removeEventListener("resize", closeSideContainer);
    };
  }, [setSideContainerOpen]);

  useEffect(() => {
    setSideContainerOpen((prev) => (prev ? false : prev));
  }, [pathname, setSideContainerOpen]);

  return (
    <Shell
      flexChildrenContainer
      {...rest}
      SidebarContainer={
        <SidebarContainerElement
          sideContainerOpen={sideContainerOpen}
          setSideContainerOpen={setSideContainerOpen}
          teamFeatures={teamFeatures}
          permissions={permissions}
        />
      }
      drawerState={state}
      MobileNavigationContainer={null}
      TopNavContainer={
        <MobileSettingsContainer onSideContainerOpen={() => setSideContainerOpen(!sideContainerOpen)} />
      }>
      <div className="*:flex-1 flex flex-1">
        <div
          className={classNames("mx-auto max-w-full justify-center lg:max-w-3xl", rest.containerClassName)}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </Shell>
  );
}

type SidebarContainerElementProps = {
  sideContainerOpen: boolean;
  bannersHeight?: number;
  setSideContainerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  teamFeatures?: Record<number, TeamFeatures>;
  permissions?: SettingsPermissions;
};

const SidebarContainerElement = ({
  sideContainerOpen,
  bannersHeight,
  setSideContainerOpen,
  teamFeatures,
  permissions,
}: SidebarContainerElementProps) => {
  const { t } = useLocale();
  return (
    <>
      {/* Mobile backdrop */}
      {sideContainerOpen && (
        <button
          onClick={() => setSideContainerOpen(false)}
          className="fixed left-0 top-0 z-10 h-full w-full bg-black/50">
          <span className="sr-only">{t("hide_navigation")}</span>
        </button>
      )}
      <SettingsSidebarContainer
        navigationIsOpenedOnMobile={sideContainerOpen}
        bannersHeight={bannersHeight}
        teamFeatures={teamFeatures}
        permissions={permissions}
      />
    </>
  );
};

export type { SettingsLayoutProps, SettingsPermissions };
export default SettingsLayoutAppDirClient;
