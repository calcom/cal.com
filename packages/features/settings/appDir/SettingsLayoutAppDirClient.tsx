"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import React, { useEffect, useState, useMemo } from "react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import type { OrganizationBranding } from "@calcom/features/ee/organizations/context/provider";
import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { HOSTED_CAL_FEATURES, IS_CALCOM, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { IdentityProvider, MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { VerticalTabItemProps } from "@calcom/ui";
import { Badge, Button, ErrorBoundary, Icon, Skeleton, VerticalTabItem } from "@calcom/ui";

const getTabs = (orgBranding: OrganizationBranding | null) => {
  const tabs: VerticalTabItemProps[] = [
    {
      name: "my_account",
      href: "/settings/my-account",
      icon: "user",
      children: [
        { name: "profile", href: "/settings/my-account/profile" },
        { name: "general", href: "/settings/my-account/general" },
        { name: "calendars", href: "/settings/my-account/calendars" },
        { name: "conferencing", href: "/settings/my-account/conferencing" },
        { name: "appearance", href: "/settings/my-account/appearance" },
        { name: "out_of_office", href: "/settings/my-account/out-of-office" },
        // TODO
        // { name: "referrals", href: "/settings/my-account/referrals" },
      ],
    },
    {
      name: "security",
      href: "/settings/security",
      icon: "key",
      children: [
        { name: "password", href: "/settings/security/password" },
        { name: "impersonation", href: "/settings/security/impersonation" },
        { name: "2fa_auth", href: "/settings/security/two-factor-auth" },
      ],
    },
    {
      name: "billing",
      href: "/settings/billing",
      icon: "credit-card",
      children: [{ name: "manage_billing", href: "/settings/billing" }],
    },
    {
      name: "developer",
      href: "/settings/developer",
      icon: "terminal",
      children: [
        //
        { name: "webhooks", href: "/settings/developer/webhooks" },
        { name: "api_keys", href: "/settings/developer/api-keys" },
        { name: "admin_api", href: "/settings/organizations/admin-api" },
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
        },
        {
          name: "general",
          href: "/settings/organizations/general",
        },
        ...(orgBranding
          ? [
              {
                name: "members",
                href: `/settings/organizations/${orgBranding.slug}/members`,
              },
            ]
          : []),
        {
          name: "privacy",
          href: "/settings/organizations/privacy",
        },
        {
          name: "billing",
          href: "/settings/organizations/billing",
        },
        { name: "OAuth Clients", href: "/settings/organizations/platform/oauth-clients" },
        {
          name: "SSO",
          href: "/settings/organizations/sso",
        },
        {
          name: "directory_sync",
          href: "/settings/organizations/dsync",
        },
        {
          name: "admin_api",
          href: "https://cal.com/docs/enterprise-features/api/api-reference/bookings#admin-access",
        },
        // {
        //   name: "domain_wide_delegation",
        //   href: "/settings/organizations/domain-wide-delegation",
        // },
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
        { name: "features", href: "/settings/admin/flags" },
        { name: "license", href: "/auth/setup?step=1" },
        { name: "impersonation", href: "/settings/admin/impersonation" },
        { name: "apps", href: "/settings/admin/apps/calendar" },
        { name: "users", href: "/settings/admin/users" },
        { name: "organizations", href: "/settings/admin/organizations" },
        { name: "lockedSMS", href: "/settings/admin/lockedSMS" },
        { name: "oAuth", href: "/settings/admin/oAuth" },
        { name: "Workspace Platforms", href: "/settings/admin/workspace-platforms" },
      ],
    },
  ];

  tabs.find((tab) => {
    if (tab.name === "security" && !HOSTED_CAL_FEATURES) {
      tab.children?.push({ name: "sso_configuration", href: "/settings/security/sso" });
      // TODO: Enable dsync for self hosters
      // tab.children?.push({ name: "directory_sync", href: "/settings/security/dsync" });
    }
    if (tab.name === "admin" && IS_CALCOM) {
      tab.children?.push({ name: "create_your_org", href: "/settings/organizations/new" });
    }
    if (tab.name === "admin" && IS_CALCOM) {
      tab.children?.push({ name: "create_license_key", href: "/settings/license-key/new" });
    }
  });

  return tabs;
};

// The following keys are assigned to admin only
const adminRequiredKeys = ["admin"];
const organizationRequiredKeys = ["organization"];
const organizationAdminKeys = ["privacy", "billing", "OAuth Clients", "SSO", "directory_sync"];

const useTabs = () => {
  const session = useSession();
  const { data: user } = trpc.viewer.me.useQuery({ includePasswordAdded: true });
  const orgBranding = useOrgBranding();
  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;
  const isOrgAdminOrOwner =
    orgBranding?.role === MembershipRole.ADMIN || orgBranding?.role === MembershipRole.OWNER;

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
          (child) => isOrgAdminOrOwner || !organizationAdminKeys.includes(child.name)
        );

        // TODO: figure out feature flag as it doesnt cause a re-render of the component when loaded.
        // You have to refresh the page to see the changes.
        if (true) {
          newArray.splice(4, 0, {
            name: "attributes",
            href: "/settings/organizations/attributes",
          });
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
          (childTab) => isOrgAdminOrOwner || childTab.name !== "admin_api"
        );
        return { ...tab, children: filtered };
      }
      return tab;
    });

    // check if name is in adminRequiredKeys
    return processedTabs.filter((tab) => {
      if (organizationRequiredKeys.includes(tab.name)) return !!orgBranding;
      if (tab.name === "other_teams" && !isOrgAdminOrOwner) return false;

      if (isAdmin) return true;
      return !adminRequiredKeys.includes(tab.name);
    });
  }, [isAdmin, orgBranding, isOrgAdminOrOwner, user]);

  return processTabsMemod;
};

const BackButtonInSidebar = ({ name }: { name: string }) => {
  return (
    <Link
      href="/"
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
  currentOrg: SettingsLayoutProps["currentOrg"];
  otherTeams: SettingsLayoutProps["otherTeams"];
}

const TeamListCollapsible = () => {
  const { data: teams } = trpc.viewer.teams.list.useQuery();
  const { t } = useLocale();
  const [teamMenuState, setTeamMenuState] =
    useState<{ teamId: number | undefined; teamMenuOpen: boolean }[]>();
  const searchParams = useCompatSearchParams();
  useEffect(() => {
    if (teams) {
      const teamStates = teams?.map((team) => ({
        teamId: team.id,
        teamMenuOpen: String(team.id) === searchParams?.get("id"),
      }));
      setTeamMenuState(teamStates);
      setTimeout(() => {
        const tabMembers = Array.from(document.getElementsByTagName("a")).filter(
          (bottom) => bottom.dataset.testid === "vertical-tab-Members"
        )[1];
        // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed -- Settings layout isn't embedded
        tabMembers?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [searchParams?.get("id"), teams]);

  return (
    <>
      {teams &&
        teamMenuState &&
        teams.map((team, index: number) => {
          if (!teamMenuState[index]) {
            return null;
          }
          if (teamMenuState.some((teamState) => teamState.teamId === team.id))
            return (
              <Collapsible
                className="cursor-pointer"
                key={team.id}
                open={teamMenuState[index].teamMenuOpen}
                onOpenChange={() =>
                  setTeamMenuState([
                    ...teamMenuState,
                    (teamMenuState[index] = {
                      ...teamMenuState[index],
                      teamMenuOpen: !teamMenuState[index].teamMenuOpen,
                    }),
                  ])
                }>
                <CollapsibleTrigger asChild>
                  <div
                    className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-left text-sm font-medium leading-none transition"
                    onClick={() =>
                      setTeamMenuState([
                        ...teamMenuState,
                        (teamMenuState[index] = {
                          ...teamMenuState[index],
                          teamMenuOpen: !teamMenuState[index].teamMenuOpen,
                        }),
                      ])
                    }>
                    <div className="me-3">
                      {teamMenuState[index].teamMenuOpen ? (
                        <Icon name="chevron-down" className="h-4 w-4" />
                      ) : (
                        <Icon name="chevron-right" className="h-4 w-4" />
                      )}
                    </div>
                    {!team.parentId && (
                      <img
                        src={getPlaceholderAvatar(team.logoUrl, team.name)}
                        className="h-[16px] w-[16px] self-start rounded-full stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0"
                        alt={team.name || "Team logo"}
                      />
                    )}
                    <p className="w-1/2 truncate leading-normal">{team.name}</p>
                    {!team.accepted && (
                      <Badge className="ms-3" variant="orange">
                        Inv.
                      </Badge>
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5">
                  {team.accepted && (
                    <VerticalTabItem
                      name={t("profile")}
                      href={`/settings/teams/${team.id}/profile`}
                      textClassNames="px-3 text-emphasis font-medium text-sm"
                      disableChevron
                    />
                  )}
                  <VerticalTabItem
                    name={t("members")}
                    href={`/settings/teams/${team.id}/members`}
                    textClassNames="px-3 text-emphasis font-medium text-sm"
                    disableChevron
                  />
                  <VerticalTabItem
                    name={t("event_types_page_title")}
                    href={`/event-types?teamId=${team.id}`}
                    textClassNames="px-3 text-emphasis font-medium text-sm"
                    disableChevron
                  />
                  {(team.role === MembershipRole.OWNER ||
                    team.role === MembershipRole.ADMIN ||
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
                        disableChevron
                      />
                      {/* Hide if there is a parent ID */}
                      {!team.parentId ? (
                        <>
                          <VerticalTabItem
                            name={t("billing")}
                            href={`/settings/teams/${team.id}/billing`}
                            textClassNames="px-3 text-emphasis font-medium text-sm"
                            disableChevron
                          />
                        </>
                      ) : null}
                      <VerticalTabItem
                        name={t("booking_limits")}
                        href={`/settings/teams/${team.id}/bookingLimits`}
                        textClassNames="px-3 text-emphasis font-medium text-sm"
                        disableChevron
                      />
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
        })}
    </>
  );
};

const SettingsSidebarContainer = ({
  className = "",
  navigationIsOpenedOnMobile,
  bannersHeight,
  currentOrg: currentOrgProp,
  otherTeams: otherTeamsProp,
}: SettingsSidebarContainerProps) => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const tabsWithPermissions = useTabs();
  const [otherTeamMenuState, setOtherTeamMenuState] = useState<
    {
      teamId: number | undefined;
      teamMenuOpen: boolean;
    }[]
  >();
  const session = useSession();
  const { data: _currentOrg } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    enabled: !!session.data?.user?.org && !currentOrgProp,
  });

  const { data: _otherTeams } = trpc.viewer.organizations.listOtherTeams.useQuery(undefined, {
    enabled: !!session.data?.user?.org && !otherTeamsProp,
  });
  const currentOrg = currentOrgProp ?? _currentOrg;
  const otherTeams = otherTeamsProp ?? _otherTeams;
  // Same as above but for otherTeams
  useEffect(() => {
    if (otherTeams) {
      const otherTeamStates = otherTeams?.map((team) => ({
        teamId: team.id,
        teamMenuOpen: String(team.id) === searchParams?.get("id"),
      }));
      setOtherTeamMenuState(otherTeamStates);
      setTimeout(() => {
        // @TODO: test if this works for 2 dataset testids
        const tabMembers = Array.from(document.getElementsByTagName("a")).filter(
          (bottom) => bottom.dataset.testid === "vertical-tab-Members"
        )[1];
        // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed -- Settings layout isn't embedded
        tabMembers?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [searchParams?.get("id"), otherTeams]);

  const isOrgAdminOrOwner =
    currentOrg && currentOrg?.user?.role && ["OWNER", "ADMIN"].includes(currentOrg?.user?.role);

  return (
    <nav
      style={{ maxHeight: `calc(100vh - ${bannersHeight}px)`, top: `${bannersHeight}px` }}
      className={classNames(
        "no-scrollbar bg-muted fixed bottom-0 left-0 top-0 z-20 flex max-h-screen w-56 flex-col space-y-1 overflow-x-hidden overflow-y-scroll px-2 pb-3 transition-transform max-lg:z-10 lg:sticky lg:flex",
        className,
        navigationIsOpenedOnMobile
          ? "translate-x-0 opacity-100"
          : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
      )}
      aria-label="Tabs">
      <>
        <BackButtonInSidebar name={t("back")} />
        {tabsWithPermissions.map((tab) => {
          return (
            <React.Fragment key={tab.href}>
              {!["teams", "other_teams"].includes(tab.name) && (
                <React.Fragment key={tab.href}>
                  <div className={`${!tab.children?.length ? "!mb-3" : ""}`}>
                    <div className="[&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default group flex h-7 w-full flex-row items-center rounded-md px-2 text-sm font-medium leading-none">
                      {tab && tab.icon && (
                        <Icon
                          name={tab.icon}
                          className="text-subtle h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0"
                        />
                      )}
                      {!tab.icon && tab?.avatar && (
                        <img
                          className="h-4 w-4 rounded-full ltr:mr-3 rtl:ml-3"
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
                  <div className="my-3 space-y-px">
                    {tab.children?.map((child, index) => (
                      <VerticalTabItem
                        key={child.href}
                        name={t(child.name)}
                        isExternalLink={child.isExternalLink}
                        href={child.href || "/"}
                        textClassNames="text-emphasis font-medium text-sm"
                        className={`me-5 h-7 !px-2 ${
                          tab.children && index === tab.children?.length - 1 && "!mb-3"
                        }`}
                        disableChevron
                      />
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
                          {t(isOrgAdminOrOwner ? "my_teams" : tab.name)}
                        </Skeleton>
                      </div>
                    </Link>
                    <TeamListCollapsible />
                    {(!currentOrg || (currentOrg && currentOrg?.user?.role !== "MEMBER")) && (
                      <VerticalTabItem
                        name={t("add_a_team")}
                        href={`${WEBAPP_URL}/settings/teams/new`}
                        textClassNames="px-3 items-center mt-2 text-emphasis font-medium text-sm"
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
                              onOpenChange={() =>
                                setOtherTeamMenuState([
                                  ...otherTeamMenuState,
                                  (otherTeamMenuState[index] = {
                                    ...otherTeamMenuState[index],
                                    teamMenuOpen: !otherTeamMenuState[index].teamMenuOpen,
                                  }),
                                ])
                              }>
                              <CollapsibleTrigger asChild>
                                <div
                                  className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-left text-sm font-medium leading-none transition"
                                  onClick={() =>
                                    setOtherTeamMenuState([
                                      ...otherTeamMenuState,
                                      (otherTeamMenuState[index] = {
                                        ...otherTeamMenuState[index],
                                        teamMenuOpen: !otherTeamMenuState[index].teamMenuOpen,
                                      }),
                                    ])
                                  }>
                                  <div className="me-3">
                                    {otherTeamMenuState[index].teamMenuOpen ? (
                                      <Icon name="chevron-down" className="h-4 w-4" />
                                    ) : (
                                      <Icon name="chevron-right" className="h-4 w-4" />
                                    )}
                                  </div>
                                  {!otherTeam.parentId && (
                                    <img
                                      src={getPlaceholderAvatar(otherTeam.logoUrl, otherTeam.name)}
                                      className="h-[16px] w-[16px] self-start rounded-full stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0"
                                      alt={otherTeam.name || "Team logo"}
                                    />
                                  )}
                                  <p className="w-1/2 truncate leading-normal">{otherTeam.name}</p>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-0.5">
                                <VerticalTabItem
                                  name={t("profile")}
                                  href={`/settings/organizations/teams/other/${otherTeam.id}/profile`}
                                  textClassNames="px-3 text-emphasis font-medium text-sm"
                                  disableChevron
                                />
                                <VerticalTabItem
                                  name={t("members")}
                                  href={`/settings/organizations/teams/other/${otherTeam.id}/members`}
                                  textClassNames="px-3 text-emphasis font-medium text-sm"
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

  return (
    <>
      <nav className="bg-muted border-muted sticky top-0 z-20 flex w-full items-center justify-between border-b px-2 py-2 sm:relative lg:hidden">
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

export type SettingsLayoutProps = {
  children: React.ReactNode;
  currentOrg: Awaited<ReturnType<typeof OrganizationRepository.findCurrentOrg>> | null;
  otherTeams: Awaited<ReturnType<typeof OrganizationRepository.findTeamsInOrgIamNotPartOf>> | null;
  containerClassName?: string;
} & ComponentProps<typeof Shell>;

export default function SettingsLayoutAppDirClient({
  children,
  currentOrg,
  otherTeams,
  ...rest
}: SettingsLayoutProps) {
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
  }, []);

  useEffect(() => {
    if (sideContainerOpen) {
      setSideContainerOpen(!sideContainerOpen);
    }
  }, [pathname]);

  return (
    <Shell
      withoutSeo={true}
      flexChildrenContainer
      hideHeadingOnMobile
      {...rest}
      SidebarContainer={
        <SidebarContainerElement
          currentOrg={currentOrg}
          otherTeams={otherTeams}
          sideContainerOpen={sideContainerOpen}
          setSideContainerOpen={setSideContainerOpen}
        />
      }
      drawerState={state}
      MobileNavigationContainer={null}
      TopNavContainer={
        <MobileSettingsContainer onSideContainerOpen={() => setSideContainerOpen(!sideContainerOpen)} />
      }>
      <div className="flex flex-1 [&>*]:flex-1">
        <div
          className={classNames("mx-auto max-w-full justify-center lg:max-w-3xl", rest.containerClassName)}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </Shell>
  );
}

const SidebarContainerElement = ({
  sideContainerOpen,
  bannersHeight,
  setSideContainerOpen,
  currentOrg,
  otherTeams,
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
        currentOrg={currentOrg}
        otherTeams={otherTeams}
      />
    </>
  );
};

type SidebarContainerElementProps = {
  sideContainerOpen: boolean;
  bannersHeight?: number;
  setSideContainerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentOrg: SettingsLayoutProps["currentOrg"];
  otherTeams: SettingsLayoutProps["otherTeams"];
};
