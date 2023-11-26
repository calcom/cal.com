import { useSession } from "next-auth/react";
import { useEffect } from "react";

import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { AnimatedPopover, Avatar, Divider } from "@calcom/ui";
import { Layers, User } from "@calcom/ui/components/icon";

import { useFilterContext } from "../context/provider";

export const TeamAndSelfList = () => {
  const { t } = useLocale();
  const session = useSession();

  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, selectedUserId, isAll } = filter;
  const { data, isSuccess } = trpc.viewer.insights.teamListForUser.useQuery(undefined, {
    // Teams don't change that frequently
    refetchOnWindowFocus: false,
    trpc: {
      context: {
        skipBatch: true,
      },
    },
  });

  useEffect(() => {
    const isInitialSetupAlready = !!(
      filter.initialConfig?.teamId ||
      filter.initialConfig?.userId ||
      filter.initialConfig?.isAll
    );
    if (isInitialSetupAlready) return;
    if (isSuccess && session.data?.user.id) {
      // We have a team?
      if (data[0]?.id && data && data?.length > 0) {
        const isAllSelected = !!data[0]?.isOrg;
        setConfigFilters({
          selectedTeamId: data[0].id,
          selectedUserId: null,
          isAll: isAllSelected,
          initialConfig: {
            teamId: data[0].id,
            userId: null,
            isAll: isAllSelected,
          },
        });
      } else if (session.data?.user.id) {
        // default to user
        setConfigFilters({
          selectedUserId: session.data?.user.id,
          initialConfig: {
            teamId: null,
            userId: session.data?.user.id,
            isAll: false,
          },
        });
      }
    }
  }, [data, session.data?.user.id, filter.initialConfig, isSuccess, setConfigFilters]);

  const getTextPopover = () => {
    if (isAll) {
      return `${t("all")}`;
    } else if (selectedUserId) {
      return `${t("yours")}`;
    } else if (selectedTeamId) {
      const selectedTeam = data?.find((item) => {
        return item.id === selectedTeamId;
      });
      return `${t("team")}: ${selectedTeam?.name}`;
    }

    return t("select");
  };

  const text = getTextPopover();

  return (
    <AnimatedPopover text={text}>
      <FilterCheckboxFieldsContainer>
        {isSuccess && data?.length > 0 && data[0].isOrg && (
          <FilterCheckboxField
            id="all"
            icon={<Layers className="h-4 w-4" />}
            checked={isAll}
            onChange={(e) => {
              setConfigFilters({
                selectedTeamId: data[0].isOrg ? data[0].id : null,
                selectedUserId: null,
                selectedTeamName: null,
                isAll: true,
              });
            }}
            label={t("all")}
          />
        )}

        <Divider />
        {data?.map((team) => (
          <FilterCheckboxField
            key={team.id}
            id={team.name || ""}
            label={team.name || ""}
            checked={selectedTeamId === team.id && !isAll}
            onChange={(e) => {
              if (e.target.checked) {
                setConfigFilters({
                  selectedTeamId: team.id,
                  selectedUserId: null,
                  selectedTeamName: team.name,
                  isAll: false,
                  // Setting these to null to reset the filters
                  selectedEventTypeId: null,
                  selectedMemberUserId: null,
                  selectedFilter: null,
                });
              } else if (!e.target.checked) {
                setConfigFilters({
                  selectedTeamId: null,
                  selectedTeamName: null,
                  isAll: false,
                });
              }
            }}
            icon={
              <Avatar
                alt={team?.name || ""}
                imageSrc={getPlaceholderAvatar(team.logo, team?.name as string)}
                size="xs"
              />
            }
          />
        ))}
        <Divider />

        <FilterCheckboxField
          id="yours"
          icon={<User className="h-4 w-4" />}
          checked={selectedUserId === session.data?.user.id}
          onChange={(e) => {
            if (e.target.checked) {
              setConfigFilters({
                selectedUserId: session.data?.user.id,
                selectedTeamId: null,
                isAll: false,
              });
            } else if (!e.target.checked) {
              setConfigFilters({
                selectedUserId: null,
                isAll: false,
              });
            }
          }}
          label={t("yours")}
        />
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
