import { useSession } from "next-auth/react";
import { useEffect } from "react";

import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";
import { AnimatedPopover, Avatar, Divider } from "@calcom/ui";
import { User } from "@calcom/ui/components/icon";

import { useFilterContext } from "../context/provider";

type TeamList = RouterOutputs["viewer"]["teams"]["list"][number];

const checkIsOrg = (team: TeamList) => {
  const metadata = teamMetadataSchema.safeParse(team.metadata);
  if (metadata.success && metadata.data?.isOrganization) return true;
  return false;
};
export const TeamAndSelfList = () => {
  const { t } = useLocale();
  const session = useSession();

  const { filter, setSelectedTeamId, setSelectedTeamName, setSelectedUserId, setIsOrg, setInitialConfig } =
    useFilterContext();
  const { selectedTeamId, selectedUserId, isOrg } = filter;
  const { data, isSuccess } = trpc.viewer.teams.list.useQuery(undefined, {
    // Teams don't change that frequently
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isSuccess && session.data?.user.id) {
      // We have a team?
      if (data[0].id && data && data?.length > 0) {
        setSelectedTeamId(data[0].id);
        setSelectedTeamName(data[0].name);
        setIsOrg(!!data[0].isOrg);
        setInitialConfig({
          teamId: data[0].id,
          userId: null,
          isOrg: checkIsOrg(data[0]),
        });
      } else if (session.data?.user.id) {
        // default to user
        setSelectedUserId(session.data?.user.id);
        setInitialConfig({
          teamId: null,
          userId: session.data?.user.id,
          isOrg: false,
        });
      }
    }
  }, [data, session.data?.user.id]);

  if (!isSuccess || data?.length === 0) return null;

  const getTextPopover = () => {
    if (selectedUserId) {
      return `${t("yours")}`;
    } else if (selectedTeamId) {
      const selectedTeam = data?.find((item: TeamList) => {
        return item.id === selectedTeamId;
      });
      return `${t("team")}: ${selectedTeam.name}`;
    }

    // return t("all");
    return t("select");
  };

  const text = getTextPopover();

  return (
    <AnimatedPopover text={text}>
      <FilterCheckboxFieldsContainer>
        {/* <FilterCheckboxField
          id="all"
          icon={<Layers className="h-4 w-4" />}
          checked={text === t("all")}
          onChange={(e) => {
            setSelectedUserId(null);
            setSelectedTeamId(null);
            setSelectedTeamName(null);
            setIsOrg(false);
          }}
          label={t("all_apps")}
        /> */}

        <FilterCheckboxField
          id="yours"
          icon={<User className="h-4 w-4" />}
          checked={selectedUserId === session.data?.user.id}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUserId(session.data?.user.id || 0);
            } else if (!e.target.checked) {
              setSelectedUserId(null);
            }
          }}
          label={t("yours")}
        />

        <Divider />
        {data
          ?.filter((t) => t.accepted)
          ?.map((team) => (
            <FilterCheckboxField
              key={team.id}
              id={team.name}
              label={team.name}
              checked={selectedTeamId === team.id}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedTeamId(team.id);
                  setSelectedTeamName(team.name);
                  setIsOrg(checkIsOrg(team));
                } else if (!e.target.checked) {
                  setSelectedTeamId(null);
                  setSelectedTeamName(null);
                  setIsOrg(false);
                }
              }}
              icon={
                <Avatar
                  alt={team?.name}
                  imageSrc={getPlaceholderAvatar(team.logo, team?.name as string)}
                  size="xs"
                />
              }
            />
          ))}
      </FilterCheckboxFieldsContainer>
    </AnimatedPopover>
  );
};
