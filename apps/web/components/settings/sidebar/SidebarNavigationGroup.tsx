"use client";

import type { getTeams } from "app/(settings)/settings/fetchers";
import { User, Key, CreditCard, Terminal, Building, Lock, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import React, { useState, useEffect } from "react";

import { HOSTED_CAL_FEATURES, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { IdentityProvider, UserPermissionRole } from "@calcom/prisma/enums";
import { VerticalTabItem, type VerticalTabItemProps } from "@calcom/ui";

const tabs: VerticalTabItemProps[] = [
  {
    name: "my_account",
    href: "/settings/my-account",
    icon: User,
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
    icon: Key,
    children: [
      { name: "password", href: "/settings/security/password" },
      { name: "impersonation", href: "/settings/security/impersonation" },
      { name: "2fa_auth", href: "/settings/security/two-factor-auth" },
    ],
  },
  {
    name: "billing",
    href: "/settings/billing",
    icon: CreditCard,
    children: [{ name: "manage_billing", href: "/settings/billing" }],
  },
  {
    name: "developer",
    href: "/settings/developer",
    icon: Terminal,
    children: [
      //
      { name: "webhooks", href: "/settings/developer/webhooks" },
      { name: "api_keys", href: "/settings/developer/api-keys" },
      // TODO: Add profile level for embeds
      // { name: "embeds", href: "/v2/settings/developer/embeds" },
    ],
  },
  {
    name: "organization",
    href: "/settings/organizations",
    icon: Building,
    children: [
      {
        name: "profile",
        href: "/settings/organizations/profile",
      },
      {
        name: "general",
        href: "/settings/organizations/general",
      },
      {
        name: "members",
        href: "/settings/organizations/members",
      },
      {
        name: "appearance",
        href: "/settings/organizations/appearance",
      },
      {
        name: "billing",
        href: "/settings/organizations/billing",
      },
    ],
  },
  {
    name: "teams",
    href: "/settings/teams",
    icon: Users,
    children: [],
  },
  {
    name: "admin",
    href: "/settings/admin",
    icon: Lock,
    children: [
      //
      { name: "features", href: "/settings/admin/flags" },
      { name: "license", href: "/auth/setup?step=1" },
      { name: "impersonation", href: "/settings/admin/impersonation" },
      { name: "apps", href: "/settings/admin/apps/calendar" },
      { name: "users", href: "/settings/admin/users" },
      { name: "organizations", href: "/settings/admin/organizations" },
    ],
  },
];

tabs.find((tab) => {
  // Add "SAML SSO" to the tab
  if (tab.name === "security" && !HOSTED_CAL_FEATURES) {
    tab.children?.push({ name: "sso_configuration", href: "/settings/security/sso" });
  }
});

// The following keys are assigned to admin only
const adminRequiredKeys = ["admin"];
const organizationRequiredKeys = ["organization"];

const useTabs = (identityProvider?: IdentityProvider) => {
  const session = useSession();

  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;

  tabs.map((tab) => {
    if (tab.href === "/settings/my-account") {
      tab.name = session.data?.user?.name || "my_account";
      tab.icon = undefined;
      tab.avatar = WEBAPP_URL + "/" + session?.data?.user?.username + "/avatar.png";
    } else if (tab.href === "/settings/security" && identityProvider === IdentityProvider.GOOGLE) {
      tab.children = tab?.children?.filter(
        (childTab) => childTab.href !== "/settings/security/two-factor-auth"
      );
    }
    return tab;
  });

  // check if name is in adminRequiredKeys
  return tabs.filter((tab) => {
    if (organizationRequiredKeys.includes(tab.name)) return !!session.data?.user?.organizationId;

    if (isAdmin) return true;
    return !adminRequiredKeys.includes(tab.name);
  });
};

export function SidebarNavigationGroup({
  identityProvider,
  teams,
}: {
  identityProvider: IdentityProvider;
  teams: Awaited<ReturnType<typeof getTeams>>;
}) {
  const { t } = useLocale();
  const tabsWithPermissions = useTabs(identityProvider);
  const query = useParams() as { id?: string };
  const [teamMenuState, setTeamMenuState] =
    useState<{ teamId: number | undefined; teamMenuOpen: boolean }[]>();

  useEffect(() => {
    if (teams) {
      const teamStates = teams?.map((team) => ({
        teamId: team.id,
        teamMenuOpen: String(team.id) === query.id,
      }));
      setTeamMenuState(teamStates);
      setTimeout(() => {
        const tabMembers = Array.from(document.getElementsByTagName("a")).filter(
          (bottom) => bottom.dataset.testid === "vertical-tab-Members"
        )[1];
        tabMembers?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [teams, query.id]);

  return (
    <>
      {tabsWithPermissions.map((tab) => (
        <React.Fragment key={tab.href}>
          <div className={`${!tab.children?.length ? "!mb-3" : ""}`}>
            <div className="[&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default group flex h-9 w-full flex-row items-center rounded-md px-2 text-sm font-medium leading-none">
              {tab && tab.icon && (
                <tab.icon className="h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0" />
              )}
              {!tab.icon && tab?.avatar && (
                <img className="h-4 w-4 rounded-full ltr:mr-3 rtl:ml-3" src={tab?.avatar} alt="User Avatar" />
              )}
              <p className="truncate text-sm font-medium leading-5">{tab.name}</p>
              {/* <Skeleton
              
                title={tab.name}
                as="p"
                className="truncate text-sm font-medium leading-5"
                loadingClassName="ms-3">
                {t(tab.name)}
              </Skeleton> */}
            </div>
          </div>
          <div className="my-3 space-y-0.5">
            {tab.children?.map((child, index) => (
              <VerticalTabItem
                key={child.href}
                name={t(child.name)}
                isExternalLink={child.isExternalLink}
                href={child.href || "/"}
                textClassNames="px-3 text-emphasis font-medium text-sm"
                className={`my-0.5 me-5 h-7 ${tab.children && index === tab.children?.length - 1 && "!mb-3"}`}
                disableChevron
              />
            ))}
          </div>
        </React.Fragment>
      ))}
    </>
  );
}

// {tabsWithPermissions.map((tab) => {
//   return tab.name !== "teams" ? (
//     <SettingSidebarItem tab={tab} key={tab.href} />
//   ) : (
//     <React.Fragment key={tab.href}>
//       <div className={`${!tab.children?.length ? "mb-3" : ""}`}>
//         <Link href={tab.href}>
//           <div className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default text-default group flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px]  text-sm font-medium leading-none">
//             {tab && tab.icon && (
//               <tab.icon className="h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0" />
//             )}
//             <Skeleton
//               title={tab.name}
//               as="p"
//               className="truncate text-sm font-medium leading-5"
//               loadingClassName="ms-3">
//               {t(tab.name)}
//             </Skeleton>
//           </div>
//         </Link>
//         {teams &&
//           teamMenuState &&
//           teams.map((team, index: number) => {
//             if (!teamMenuState[index]) {
//               return null;
//             }
//             if (teamMenuState.some((teamState) => teamState.teamId === team.id))
//               return (
//                 <Collapsible
//                   key={team.id}
//                   open={teamMenuState[index].teamMenuOpen}
//                   onOpenChange={() =>
//                     setTeamMenuState([
//                       ...teamMenuState,
//                       (teamMenuState[index] = {
//                         ...teamMenuState[index],
//                         teamMenuOpen: !teamMenuState[index].teamMenuOpen,
//                       }),
//                     ])
//                   }>
//                   <CollapsibleTrigger asChild>
//                     <div
//                       className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default flex h-9 w-full flex-row items-center rounded-md px-3 py-[10px]  text-left text-sm font-medium leading-none"
//                       onClick={() =>
//                         setTeamMenuState([
//                           ...teamMenuState,
//                           (teamMenuState[index] = {
//                             ...teamMenuState[index],
//                             teamMenuOpen: !teamMenuState[index].teamMenuOpen,
//                           }),
//                         ])
//                       }>
//                       <div className="me-3">
//                         {teamMenuState[index].teamMenuOpen ? (
//                           <ChevronDown className="h-4 w-4" />
//                         ) : (
//                           <ChevronRight className="h-4 w-4" />
//                         )}
//                       </div>
//                       <img
//                         src={getPlaceholderAvatar(team.logo, team?.name as string)}
//                         className="h-[16px] w-[16px] self-start rounded-full stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0"
//                         alt={team.name || "Team logo"}
//                       />
//                       <p className="w-1/2 truncate">{team.name}</p>
//                       {!team.accepted && (
//                         <Badge className="ms-3" variant="orange">
//                           Inv.
//                         </Badge>
//                       )}
//                     </div>
//                   </CollapsibleTrigger>
//                   <CollapsibleContent className="space-y-0.5">
//                     {team.accepted && (
//                       <VerticalTabItem
//                         name={t("profile")}
//                         href={`/settings/teams/${team.id}/profile`}
//                         textClassNames="px-3 text-emphasis font-medium text-sm"
//                         disableChevron
//                       />
//                     )}
//                     <VerticalTabItem
//                       name={t("members")}
//                       href={`/settings/teams/${team.id}/members`}
//                       textClassNames="px-3 text-emphasis font-medium text-sm"
//                       disableChevron
//                     />
//                     {(team.role === MembershipRole.OWNER ||
//                       team.role === MembershipRole.ADMIN ||
//                       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                       // @ts-ignore this exists wtf?
//                       (team.isOrgAdmin && team.isOrgAdmin)) && (
//                       <>
//                         {/* TODO */}
//                         {/* <VerticalTabItem
//                         name={t("general")}
//                         href={`${WEBAPP_URL}/settings/my-account/appearance`}
//                         textClassNames="px-3 text-emphasis font-medium text-sm"
//                         disableChevron
//                       /> */}
//                         <VerticalTabItem
//                           name={t("appearance")}
//                           href={`/settings/teams/${team.id}/appearance`}
//                           textClassNames="px-3 text-emphasis font-medium text-sm"
//                           disableChevron
//                         />
//                         {/* Hide if there is a parent ID */}
//                         {!team.parentId ? (
//                           <>
//                             <VerticalTabItem
//                               name={t("billing")}
//                               href={`/settings/teams/${team.id}/billing`}
//                               textClassNames="px-3 text-emphasis font-medium text-sm"
//                               disableChevron
//                             />
//                             {HOSTED_CAL_FEATURES && (
//                               <VerticalTabItem
//                                 name={t("saml_config")}
//                                 href={`/settings/teams/${team.id}/sso`}
//                                 textClassNames="px-3 text-emphasis font-medium text-sm"
//                                 disableChevron
//                               />
//                             )}
//                           </>
//                         ) : null}
//                       </>
//                     )}
//                   </CollapsibleContent>
//                 </Collapsible>
//               );
//           })}
//         {(!currentOrg || (currentOrg && currentOrg?.user?.role !== "MEMBER")) && (
//           <VerticalTabItem
//             name={t("add_a_team")}
//             href={`${WEBAPP_URL}/settings/teams/new`}
//             textClassNames="px-3 items-center mt-2 text-emphasis font-medium text-sm"
//             icon={Plus}
//             disableChevron
//           />
//         )}
//       </div>
//     </React.Fragment>
//   );
// })}
