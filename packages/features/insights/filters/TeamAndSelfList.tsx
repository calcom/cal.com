import { useEffect } from "react";
import type { Namespace, TFunction } from "react-i18next";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { Select } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type Team = RouterOutputs["viewer"]["insights"]["teamListForUser"][number];
type Option = { value: number; label: string | null; userId?: number; isOrg?: boolean };

const mapTeamToOption = (team: Team, t: TFunction<Namespace<string>, undefined>): Option => {
  if (team.isOrg) {
    return {
      value: team.id,
      label: `${t("insights_all_org_filter")}`,
    };
  }
  return {
    value: team.id,
    label: team.userId
      ? `${t("insights_user_filter", {
          userName: team.name,
        })}`
      : `${t("insights_team_filter", {
          teamName: team.name,
        })}`,
    userId: team.userId,
  };
};

export const TeamAndSelfList = () => {
  const { t } = useLocale();
  const { filter, setSelectedTeamId, setSelectedTeamName, setSelectedUserId, setIsOrg, setInitialConfig } =
    useFilterContext();
  const { selectedTeamId, selectedUserId, isOrg } = filter;
  const { data, isSuccess } = trpc.viewer.insights.teamListForUser.useQuery();

  useEffect(() => {
    if (data && data?.length > 0) {
      // We have a team?
      if (data[0].id) {
        setSelectedTeamId(data[0].id);
        setSelectedTeamName(data[0].name);
        setIsOrg(!!data[0].isOrg);
        setInitialConfig({
          teamId: data[0].id,
          userId: null,
          isOrg: !!data[0].isOrg,
        });
      } else if (data[0].userId) {
        // default to user
        setSelectedUserId(data[0].userId);
        setInitialConfig({
          teamId: null,
          userId: data[0].userId,
          isOrg: false,
        });
      }
    }
  }, [data]);

  const UserListOptions =
    data?.map((item) => mapTeamToOption(item, t)) || ([{ label: "Empty", value: -1 }] as Option[]);
  const selectedTeam = data?.find((item: Team) => {
    if (!!selectedUserId && !selectedTeamId) {
      return item.userId === selectedUserId;
    }
    return item.id === selectedTeamId;
  });
  const teamValue = selectedTeam ? mapTeamToOption(selectedTeam, t) : null;

  if (!isSuccess || data?.length === 0) return null;

  return (
    <>
      <Select<Option>
        isSearchable={false}
        isMulti={false}
        value={teamValue}
        defaultValue={selectedTeamId ? { value: data[0].id, label: data[0].name } : null}
        className="h-[38px] w-[100vw] min-w-[160px] max-w-[150px]"
        options={UserListOptions}
        onChange={(input) => {
          if (!!input?.userId) {
            setSelectedUserId(input.userId);
          } else if (input && input.value) {
            setSelectedTeamId(input.value);
            setSelectedTeamName(input.label);
            setIsOrg(!!input.isOrg);
          }
        }}
      />
    </>
  );
};
