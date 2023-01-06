import { MembershipRole, UserPermissionRole } from "@prisma/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { ComponentProps, useEffect, useState } from "react";

import { classNames } from "@calcom/lib";
import { HOSTED_CAL_FEATURES, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  ErrorBoundary,
  Icon,
  VerticalTabItemProps,
  VerticalTabItem,
  Shell,
  Skeleton,
  useMeta,
} from "@calcom/ui";

const tabs: VerticalTabItemProps[] = [
  {
    name: "my_account",
    href: "/settings/my-account",
    icon: Icon.FiUser,
    children: [
      { name: "profile", href: "/settings/my-account/profile" },
      { name: "general", href: "/settings/my-account/general" },
      { name: "calendars", href: "/settings/my-account/calendars" },
      { name: "conferencing", href: "/settings/my-account/conferencing" },
      { name: "appearance", href: "/settings/my-account/appearance" },
      // TODO
      // { name: "referrals", href: "/settings/my-account/referrals" },
    ],
  },
  {
    name: "security",
    href: "/settings/security",
    icon: Icon.FiKey,
    children: [
      { name: "password", href: "/settings/security/password" },
      { name: "2fa_auth", href: "/settings/security/two-factor-auth" },
      { name: "impersonation", href: "/settings/security/impersonation" },
    ],
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: Icon.FiCreditCard,
    children: [{ name: "manage_billing", href: "/settings/billing" }],
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Icon.FiTerminal,
    children: [
      //
      { name: "webhooks", href: "/settings/developer/webhooks" },
      { name: "api_keys", href: "/settings/developer/api-keys" },
      // TODO: Add profile level for embeds
      // { name: "embeds", href: "/v2/settings/developer/embeds" },
    ],
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Icon.FiUsers,
    children: [],
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Icon.FiLock,
    children: [
      //
      { name: "impersonation", href: "/settings/admin/impersonation" },
      { name: "apps", href: "/settings/admin/apps/calendar" },
      { name: "users", href: "/settings/admin/users" },
    ],
  },
];

tabs.find((tab) => {
  // Add "SAML SSO" to the tab
  if (tab.name === "security" && !HOSTED_CAL_FEATURES) {
    tab.children?.push({ name: "saml_config", href: "/settings/security/sso" });
  }
});

// The following keys are assigned to admin only
const adminRequiredKeys = ["admin"];

const useTabs = () => {
  const session = useSession();

  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;

  tabs.map((tab) => {
    if (tab.name === "my_account") {
      tab.name = session.data?.user?.name || "my_account";
      tab.icon = undefined;
      tab.avatar = WEBAPP_URL + "/" + session.data?.user?.username + "/avatar.png";
    }
    return tab;
  });

  // check if name is in adminRequiredKeys
  return tabs.filter((tab) => {
    if (isAdmin) return true;
    return !adminRequiredKeys.includes(tab.name);
  });
};

const BackButtonInSidebar = ({ name }: { name: string }) => {
  return (
    <Link
      href="/."
      target="_self"
      className="group my-6 flex h-6 max-h-6 w-64 flex-row items-center rounded-md py-2 px-3 text-sm font-medium leading-4 text-black hover:bg-gray-100 group-hover:text-gray-700 [&[aria-current='page']]:bg-gray-200 [&[aria-current='page']]:text-gray-900"
      data-testid={`vertical-tab-${name}`}>
      <Icon.FiArrowLeft className="h-4 w-4 stroke-[2px] ltr:mr-[10px] rtl:ml-[10px] md:mt-0" />
      <Skeleton title={name} as="p" className="max-w-36 min-h-4 truncate">
        {name}
      </Skeleton>
    </Link>
  );
};

interface SettingsSidebarContainerProps {
  className?: string;
  navigationIsOpenedOnMobile?: boolean;
}

const SettingsSidebarContainer = ({
  className = "",
  navigationIsOpenedOnMobile,
}: SettingsSidebarContainerProps) => {
  const { t } = useLocale();
  const router = useRouter();
  const tabsWithPermissions = useTabs();
  const [teamMenuState, setTeamMenuState] =
    useState<{ teamId: number | undefined; teamMenuOpen: boolean }[]>();

  const { data: teams } = trpc.viewer.teams.list.useQuery();

  useEffect(() => {
    if (teams) {
      const teamStates = teams?.map((team) => ({
        teamId: team.id,
        teamMenuOpen: String(team.id) === router.query.id,
      }));
      setTeamMenuState(teamStates);
      setTimeout(() => {
        const tabMembers = Array.from(document.getElementsByTagName("a")).filter(
          (bottom) => bottom.dataset.testid === "vertical-tab-Members"
        )[1];
        tabMembers?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [router.query.id, teams]);

  return (
    <nav
      className={classNames(
        "no-scrollbar fixed left-0 top-0 z-10 flex max-h-screen w-56 flex-col space-y-1 overflow-x-hidden overflow-y-scroll bg-gray-50 px-2 pb-3 transition-transform lg:sticky lg:flex",
        className,
        navigationIsOpenedOnMobile
          ? "opacity-0 ltr:-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:opacity-100"
          : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
      )}
      aria-label="Tabs">
      <>
        <BackButtonInSidebar name={t("back")} />
        {tabsWithPermissions.map((tab) => {
          return tab.name !== "teams" ? (
            <React.Fragment key={tab.href}>
              <div className={`${!tab.children?.length ? "!mb-3" : ""}`}>
                <div className="group flex h-9 w-64 flex-row items-center rounded-md px-3 text-sm font-medium leading-none text-gray-600 [&[aria-current='page']]:bg-gray-200 [&[aria-current='page']]:text-gray-900">
                  {tab && tab.icon && (
                    <tab.icon className="h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0" />
                  )}
                  {!tab.icon && tab?.avatar && (
                    <img
                      className="h-4 w-4 rounded-full ltr:mr-3 rtl:ml-3"
                      src={tab?.avatar}
                      alt="User Avatar"
                    />
                  )}
                  <p className="text-sm font-medium leading-5">{t(tab.name)}</p>
                </div>
              </div>
              <div className="my-3">
                {tab.children?.map((child, index) => (
                  <VerticalTabItem
                    key={child.href}
                    name={t(child.name)}
                    isExternalLink={child.isExternalLink}
                    href={child.href || "/"}
                    textClassNames="px-3 text-gray-900 font-medium text-sm"
                    className={`my-0.5 h-7 ${tab.children && index === tab.children?.length - 1 && "!mb-3"}`}
                    disableChevron
                  />
                ))}
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment key={tab.href}>
              <div className={`${!tab.children?.length ? "mb-3" : ""}`}>
                <Link href={tab.href}>
                  <div className="group flex h-9 w-64 flex-row items-center rounded-md px-3 py-[10px] text-sm font-medium leading-none text-gray-600 hover:bg-gray-100  group-hover:text-gray-700 [&[aria-current='page']]:bg-gray-200 [&[aria-current='page']]:text-gray-900">
                    {tab && tab.icon && (
                      <tab.icon className="h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0" />
                    )}
                    <p className="text-sm font-medium leading-5">{t(tab.name)}</p>
                  </div>
                </Link>
                {teams &&
                  teamMenuState &&
                  teams.map((team, index: number) => {
                    if (teamMenuState.some((teamState) => teamState.teamId === team.id))
                      return (
                        <Collapsible
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
                          <CollapsibleTrigger>
                            <div
                              className="flex h-9 w-64 flex-row items-center rounded-md px-3 py-[10px] text-sm font-medium leading-none hover:bg-gray-100  group-hover:text-gray-700 [&[aria-current='page']]:bg-gray-200 [&[aria-current='page']]:text-gray-900"
                              onClick={() =>
                                setTeamMenuState([
                                  ...teamMenuState,
                                  (teamMenuState[index] = {
                                    ...teamMenuState[index],
                                    teamMenuOpen: !teamMenuState[index].teamMenuOpen,
                                  }),
                                ])
                              }>
                              <div className="ltr:mr-3 rtl:ml-3">
                                {teamMenuState[index].teamMenuOpen ? (
                                  <Icon.FiChevronDown />
                                ) : (
                                  <Icon.FiChevronRight />
                                )}
                              </div>
                              <img
                                src={getPlaceholderAvatar(team.logo, team?.name as string)}
                                className="h-[16px] w-[16px] self-start rounded-full stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0"
                                alt={team.name || "Team logo"}
                              />
                              <p>{team.name}</p>
                              {!team.accepted && (
                                <Badge className="ltr:ml-3 rtl:mr-3" variant="orange">
                                  Inv.
                                </Badge>
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            {team.accepted && (
                              <VerticalTabItem
                                name={t("profile")}
                                href={`/settings/teams/${team.id}/profile`}
                                textClassNames="px-3 text-gray-900 font-medium text-sm"
                                disableChevron
                              />
                            )}
                            <VerticalTabItem
                              name={t("members")}
                              href={`/settings/teams/${team.id}/members`}
                              textClassNames="px-3 text-gray-900 font-medium text-sm"
                              disableChevron
                            />
                            {(team.role === MembershipRole.OWNER || team.role === MembershipRole.ADMIN) && (
                              <>
                                {/* TODO */}
                                {/* <VerticalTabItem
                              name={t("general")}
                              href={`${WEBAPP_URL}/settings/my-account/appearance`}
                              textClassNames="px-3 text-gray-900 font-medium text-sm"
                              disableChevron
                            /> */}
                                <VerticalTabItem
                                  name={t("appearance")}
                                  href={`/settings/teams/${team.id}/appearance`}
                                  textClassNames="px-3 text-gray-900 font-medium text-sm"
                                  disableChevron
                                />
                                <VerticalTabItem
                                  name={t("billing")}
                                  href={`/settings/teams/${team.id}/billing`}
                                  textClassNames="px-3 text-gray-900 font-medium text-sm"
                                  disableChevron
                                />
                                {HOSTED_CAL_FEATURES && (
                                  <VerticalTabItem
                                    name={t("saml_config")}
                                    href={`/settings/teams/${team.id}/sso`}
                                    textClassNames="px-3 text-gray-900 font-medium text-sm"
                                    disableChevron
                                  />
                                )}
                              </>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                  })}
                <VerticalTabItem
                  name={t("add_a_team")}
                  href={`${WEBAPP_URL}/settings/teams/new`}
                  textClassNames="px-3 text-gray-900 font-medium text-sm"
                  icon={Icon.FiPlus}
                  disableChevron
                />
              </div>
            </React.Fragment>
          );
        })}
      </>
    </nav>
  );
};

const MobileSettingsContainer = (props: { onSideContainerOpen?: () => void }) => {
  const { t } = useLocale();

  return (
    <>
      <nav className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-gray-100 bg-gray-50 p-4 sm:relative lg:hidden">
        <div className="flex items-center space-x-3 ">
          <Button StartIcon={Icon.FiMenu} color="minimal" size="icon" onClick={props.onSideContainerOpen}>
            <span className="sr-only">{t("show_navigation")}</span>
          </Button>

          <a
            href="/"
            className="flex items-center space-x-2 rounded-md px-3 py-1 hover:bg-gray-200 rtl:space-x-reverse">
            <Icon.FiArrowLeft className="text-gray-700" />
            <p className="font-semibold text-black">{t("settings")}</p>
          </a>
        </div>
      </nav>
    </>
  );
};

export default function SettingsLayout({
  children,
  ...rest
}: { children: React.ReactNode } & ComponentProps<typeof Shell>) {
  const router = useRouter();
  const state = useState(false);
  const { t } = useLocale();
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
  }, [router.asPath]);

  return (
    <Shell
      withoutSeo={true}
      flexChildrenContainer
      {...rest}
      SidebarContainer={
        <>
          {/* Mobile backdrop */}
          {sideContainerOpen && (
            <button
              onClick={() => setSideContainerOpen(false)}
              className="fixed top-0 left-0 z-10 h-full w-full bg-black/50">
              <span className="sr-only">{t("hide_navigation")}</span>
            </button>
          )}
          <SettingsSidebarContainer navigationIsOpenedOnMobile={sideContainerOpen} />
        </>
      }
      drawerState={state}
      MobileNavigationContainer={null}
      TopNavContainer={
        <MobileSettingsContainer onSideContainerOpen={() => setSideContainerOpen(!sideContainerOpen)} />
      }>
      <div className="flex flex-1 [&>*]:flex-1">
        <div className="mx-auto max-w-full justify-center md:max-w-3xl">
          <ShellHeader />
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </Shell>
  );
}

export const getLayout = (page: React.ReactElement) => <SettingsLayout>{page}</SettingsLayout>;

function ShellHeader() {
  const { meta } = useMeta();
  const { t, isLocaleReady } = useLocale();
  return (
    <header className="mx-auto block justify-between pt-8 sm:flex">
      <div className="mb-8 flex w-full items-center border-b border-gray-200 pb-8">
        {meta.backButton && (
          <a href="javascript:history.back()">
            <Icon.FiArrowLeft className="mr-7" />
          </a>
        )}
        <div>
          {meta.title && isLocaleReady ? (
            <h1 className="font-cal mb-1 text-xl font-bold tracking-wide text-black">{t(meta.title)}</h1>
          ) : (
            <div className="mb-1 h-6 w-24 animate-pulse rounded-md bg-gray-200" />
          )}
          {meta.description && isLocaleReady ? (
            <p className="text-sm text-gray-600 ltr:mr-4 rtl:ml-4">{t(meta.description)}</p>
          ) : (
            <div className="mb-1 h-6 w-32 animate-pulse rounded-md bg-gray-200" />
          )}
        </div>
        <div className="ml-auto">{meta.CTA}</div>
      </div>
    </header>
  );
}
