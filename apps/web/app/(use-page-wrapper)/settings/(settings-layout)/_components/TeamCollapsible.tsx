"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Icon } from "@calcom/ui/components/icon";
import { VerticalTabItem } from "@calcom/ui/components/navigation";

import { useSettingsStore } from "../../_lib/stores/settings-store";

interface TeamCollapsibleProps {
  type: "teams" | "other_teams";
  isOrgAdmin?: boolean;
}

export default function TeamCollapsible({ type, isOrgAdmin }: TeamCollapsibleProps) {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const tabs = useSettingsStore((state) => state.tabs);
  const teamExpansionState = useSettingsStore((state) =>
    type === "teams" ? state.teamExpansionState : state.otherTeamExpansionState
  );
  const setTeamExpanded = useSettingsStore((state) =>
    type === "teams" ? state.setTeamExpanded : state.setOtherTeamExpanded
  );

  // Find the teams or other_teams tab
  const teamsTab = tabs.find((tab) => tab.key === type);
  const teams = useMemo(() => teamsTab?.children || [], [teamsTab]);

  // Initialize expansion state from URL params
  useEffect(() => {
    const teamId = searchParams?.get("id");
    if (teamId && teams.length > 0) {
      // Find if this team ID matches any of our teams
      const matchingTeam = teams.find(
        (team) => team.key === `${type === "teams" ? "team" : "other_team"}_${teamId}`
      );
      if (matchingTeam) {
        const id = matchingTeam.key.split("_").pop();
        if (id) {
          setTeamExpanded(id, true);
          // Scroll to the team after a short delay
          setTimeout(() => {
            const element = document.querySelector(`[data-team-id="${id}"]`);
            // This isnt in embed.
            // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed
            element?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      }
    }
  }, [searchParams, teams, setTeamExpanded, type]);

  if (teams.length === 0) {
    return null;
  }

  const title = type === "teams" ? (isOrgAdmin ? t("my_teams") : t("teams")) : t("org_admin_other_teams");

  return (
    <div className={teams.length === 0 ? "mb-3" : ""}>
      {/* Teams header link */}
      <Link href={type === "teams" ? "/teams" : "/settings/organizations/teams/other"}>
        <div className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis group-hover:text-default text-default group flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-sm font-medium leading-none transition">
          <Icon
            name="users"
            className="text-subtle h-[16px] w-[16px] stroke-[2px] ltr:mr-3 rtl:ml-3 md:mt-0"
          />
          <p className="text-subtle truncate text-sm font-medium leading-5">{title}</p>
        </div>
      </Link>

      {/* Team list */}
      {teams.map((team) => {
        const teamId = team.key.split("_").pop() || "";
        const isExpanded = teamExpansionState[teamId] || false;
        const teamData = team;

        return (
          <Collapsible
            key={team.key}
            className="cursor-pointer"
            open={isExpanded}
            onOpenChange={(open) => setTeamExpanded(teamId, open)}
            data-team-id={teamId}>
            <CollapsibleTrigger asChild>
              <button
                className="hover:bg-subtle [&[aria-current='page']]:bg-emphasis [&[aria-current='page']]:text-emphasis text-default flex h-9 w-full flex-row items-center rounded-md px-2 py-[10px] text-left text-sm font-medium leading-none transition"
                aria-expanded={isExpanded}>
                <div className="me-3">
                  {isExpanded ? (
                    <Icon name="chevron-down" className="h-4 w-4" />
                  ) : (
                    <Icon name="chevron-right" className="h-4 w-4" />
                  )}
                </div>
                {teamData.logoUrl !== undefined && (
                  <img
                    src={getPlaceholderAvatar(teamData.logoUrl, team.name)}
                    className="h-[16px] w-[16px] self-start rounded-full stroke-[2px] ltr:mr-2 rtl:ml-2 md:mt-0"
                    alt={team.name || "Team logo"}
                  />
                )}
                <p className="w-1/2 truncate leading-normal">{team.name}</p>
                {teamData.accepted === false && (
                  <Badge className="ms-3" variant="orange">
                    Inv.
                  </Badge>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {team.children?.map((child) => (
                <VerticalTabItem
                  key={child.key}
                  name={t(child.name)}
                  href={child.href}
                  textClassNames="px-3 text-emphasis font-medium text-sm"
                  disableChevron
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
