import { useSession } from "next-auth/react";
import { useState } from "react";

import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { AnimatedPopover, Avatar, Divider, Icon, FilterSearchField } from "@calcom/ui";

export type OrgTeamsType = "org" | "team" | "yours";

// This is a clone of TeamAndSelfList, but without useFilterContext().
// It's meant to be used in the RoutingFormResponsesTable.
export const OrgTeamsFilter = ({
  selectedType,
  selectedTeamId,
  onSelected,
}: {
  selectedType: OrgTeamsType;
  selectedTeamId?: number;
  onSelected: (params: { type: OrgTeamsType; teamId?: number }) => void;
}) => {
  const { t } = useLocale();
  const session = useSession();
  const currentOrgId = session.data?.user.org?.id;
  const currentUserId = session.data?.user.id;
  const currentUserName = session.data?.user.name;

  const [query, setQuery] = useState<string>("");

  const { data, isSuccess } = trpc.viewer.insights.teamListForUser.useQuery(undefined, {
    // Teams don't change that frequently
    refetchOnWindowFocus: false,
    trpc: {
      context: {
        skipBatch: true,
      },
    },
  });

  const getPopoverProps = () => {
    if (selectedType === "org") {
      return { text: t("all"), placeholder: undefined, imageUrl: data?.[0].logoUrl };
    } else if (selectedType === "yours") {
      return { text: t("yours"), placeholder: currentUserName, imageUrl: session.data?.user.avatarUrl };
    } else if (selectedType === "team") {
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

  const { text, placeholder, imageUrl } = getPopoverProps();
  const isOrgDataAvailable = !!data && data.length > 0 && !!data[0].isOrg;

  const PrefixComponent =
    selectedType !== undefined && (imageUrl || placeholder) ? (
      <Avatar
        alt={`${placeholder} logo`}
        imageSrc={getPlaceholderAvatar(imageUrl, placeholder)}
        size="xsm"
        className="mr-2"
      />
    ) : null;

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
            icon={<Icon name="layers" className="h-4 w-4" />}
            checked={selectedType === "org"}
            onChange={(e) => {
              onSelected({ type: "org", teamId: undefined });
            }}
            label={t("all")}
          />
        )}

        <FilterCheckboxField
          id="yours"
          icon={
            <Avatar
              alt={`${currentUserName} avatar`}
              imageSrc={getPlaceholderAvatar(session.data?.user.avatarUrl, currentUserName)}
              size="xsm"
            />
          }
          checked={selectedType === "yours"}
          onChange={(e) => {
            if (e.target.checked) {
              onSelected({ type: "yours", teamId: undefined });
            } else if (!e.target.checked) {
              onSelected({ type: currentOrgId ? "org" : "yours", teamId: undefined });
            }
          }}
          label={t("yours")}
        />

        <Divider />
        {data
          ?.filter((team) => !team.isOrg)
          .filter((team) => team.name?.toLowerCase().includes(query.toLowerCase()))
          .map((team) => {
            return (
              <FilterCheckboxField
                key={team.id}
                id={team.name || ""}
                label={team.name || ""}
                checked={selectedTeamId === team.id && selectedType === "team"}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelected({ type: "team", teamId: team.id });
                  } else if (!e.target.checked) {
                    onSelected({ type: currentOrgId ? "org" : "yours", teamId: undefined });
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
