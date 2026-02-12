import { useSession } from "next-auth/react";
import { useState } from "react";

import { FilterCheckboxField, FilterCheckboxFieldsContainer } from "~/filters/components/TeamsFilter";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Divider } from "@calcom/ui/components/divider";
import { FilterSearchField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { AnimatedPopover } from "@calcom/ui/components/popover";

import { useInsightsOrgTeams } from "../../hooks/useInsightsOrgTeams";

export type OrgTeamsType = "org" | "team" | "yours";

export const OrgTeamsFilter = () => {
  const { orgTeamsType, selectedTeamId, setOrgTeamsType, setSelectedTeamId } = useInsightsOrgTeams();
  const { t } = useLocale();
  const session = useSession();
  const currentOrgId = session.data?.user.org?.id;
  const currentUserName = session.data?.user.name;

  const [query, setQuery] = useState<string>("");

  const { data } = trpc.viewer.insights.teamListForUser.useQuery(undefined, {
    // Teams don't change that frequently
    refetchOnWindowFocus: false,
    trpc: {
      context: {
        skipBatch: true,
      },
    },
  });

  const onSelected = (params: { type: OrgTeamsType; teamId?: number }) => {
    setOrgTeamsType(params.type);
    setSelectedTeamId(params.teamId);
  };

  const getPopoverProps = () => {
    if (orgTeamsType === "org") {
      return { text: t("all"), placeholder: undefined, imageUrl: data?.[0]?.logoUrl };
    } else if (orgTeamsType === "yours") {
      return { text: t("yours"), placeholder: currentUserName, imageUrl: session.data?.user.avatarUrl };
    } else if (orgTeamsType === "team") {
      const selectedTeam = data?.find((item) => {
        return item.id === selectedTeamId;
      });
      return {
        text: `${t("team")}: ${selectedTeam?.name}`,
        placeholder: selectedTeam?.name,
        imageUrl: selectedTeam?.logoUrl,
      };
    }

    return { text: t("select"), imageUrl: undefined };
  };

  const resetSelection = () => {
    if (isOrgDataAvailable) {
      onSelected({ type: "org", teamId: currentOrgId });
    } else {
      onSelected({ type: "yours", teamId: undefined });
    }
  };

  const { text, placeholder, imageUrl } = getPopoverProps();
  const isOrgDataAvailable = !!data && data.length > 0 && !!data[0].isOrg && data[0].id === currentOrgId;

  const PrefixComponent =
    orgTeamsType !== undefined && (imageUrl || placeholder) ? (
      <Avatar
        alt={`${placeholder} logo`}
        imageSrc={getPlaceholderAvatar(imageUrl, placeholder)}
        size="xs"
        className="mr-2"
      />
    ) : null;

  const teams = (data || [])
    .filter((team) => !team.isOrg)
    .filter((team) => team.name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <AnimatedPopover text={text} PrefixComponent={PrefixComponent} popoverTriggerClassNames="mb-0">
      <FilterCheckboxFieldsContainer>
        <FilterSearchField
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Divider />

        {isOrgDataAvailable && (
          <FilterCheckboxField
            id="all"
            testId="org-teams-filter-item"
            icon={<Icon name="layers" className="h-4 w-4" />}
            checked={orgTeamsType === "org"}
            onChange={(e) => {
              if (e.target.checked) {
                onSelected({ type: "org", teamId: currentOrgId });
              } else {
                resetSelection();
              }
            }}
            label={t("all")}
          />
        )}

        <FilterCheckboxField
          id="yours"
          testId="org-teams-filter-item"
          icon={
            <Avatar
              alt={`${currentUserName} avatar`}
              imageSrc={getPlaceholderAvatar(session.data?.user.avatarUrl, currentUserName)}
              size="xsm"
            />
          }
          checked={orgTeamsType === "yours"}
          onChange={(e) => {
            if (e.target.checked) {
              onSelected({ type: "yours", teamId: undefined });
            } else if (!e.target.checked) {
              resetSelection();
            }
          }}
          label={t("yours")}
        />

        {teams.length > 0 && <Divider />}
        {teams.map((team) => {
          return (
            <FilterCheckboxField
              testId="org-teams-filter-item"
              key={team.id}
              id={team.name || ""}
              label={team.name || ""}
              checked={selectedTeamId === team.id && orgTeamsType === "team"}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelected({ type: "team", teamId: team.id });
                } else if (!e.target.checked) {
                  resetSelection();
                }
              }}
              icon={
                <Avatar
                  alt={team.name || ""}
                  imageSrc={getPlaceholderAvatar(team.logoUrl, team.name)}
                  size="xs"
                />
              }
            />
          );
        })}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
