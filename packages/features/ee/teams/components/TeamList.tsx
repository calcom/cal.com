import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Card, showToast } from "@calcom/ui";
import { UserPlus, Users, Edit } from "@calcom/ui/components/icon";

import TeamListItem from "./TeamListItem";

interface Props {
  teams: RouterOutputs["viewer"]["teams"]["list"];
  pending?: boolean;
}

export default function TeamList(props: Props) {
  const utils = trpc.useContext();

  const { t } = useLocale();

  const [hideDropdown, setHideDropdown] = useState(false);

  function selectAction(action: string, teamId: number) {
    switch (action) {
      case "disband":
        deleteTeam(teamId);
        break;
    }
  }

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.list.invalidate();
      await utils.viewer.teams.hasTeamPlan.invalidate();
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  return (
    <ul className="bg-default divide-subtle border-subtle mb-2 divide-y rounded border">
      {props.teams.map((team) => (
        <TeamListItem
          key={team?.id as number}
          team={team}
          onActionSelect={(action: string) => selectAction(action, team?.id as number)}
          isLoading={deleteTeamMutation.isLoading}
          hideDropdown={hideDropdown}
          setHideDropdown={setHideDropdown}
        />
      ))}

      {/* only show recommended steps when there is only one team */}
      {!props.pending && props.teams.length === 1 && (
        <>
          {props.teams.map(
            (team, i) =>
              team.role !== "MEMBER" &&
              i === 0 && (
                <div className="bg-subtle p-6">
                  <h3 className="text-emphasis mb-4 text-sm font-semibold">{t("recommended_next_steps")}</h3>
                  <div className="grid-col-1 grid gap-2 md:grid-cols-3">
                    <Card
                      icon={<UserPlus className="h-5 w-5 text-green-700" />}
                      variant="basic"
                      title={t("invite_team_member")}
                      description={t("meetings_are_better_with_the_right")}
                      actionButton={{
                        href: "/settings/teams/" + team.id + "/members",
                        child: t("invite"),
                      }}
                    />
                    {/* @TODO: uncomment once managed event types is live
                    <Card
                      icon={<Unlock className="h-5 w-5 text-blue-700" />}
                      variant="basic"
                      title={t("create_a_managed_event")}
                      description={t("create_a_one_one_template")}
                      actionButton={{
                        href:
                          "/event-types?dialog=new-eventtype&eventPage=team%2F" +
                          team.slug +
                          "&teamId=" +
                          team.id +
                          "&managed=true",
                        child: t("create"),
                      }}
                    /> */}
                    <Card
                      icon={<Users className="h-5 w-5 text-orange-700" />}
                      variant="basic"
                      title={t("collective_or_roundrobin")}
                      description={t("book_your_team_members")}
                      actionButton={{
                        href: "/event-types?dialog=new&eventPage=team%2F" + team.slug + "&teamId=" + team.id,
                        child: t("create"),
                      }}
                    />
                    <Card
                      icon={<Edit className="h-5 w-5 text-purple-700" />}
                      variant="basic"
                      title={t("appearance")}
                      description={t("appearance_subtitle")}
                      actionButton={{
                        href: "/settings/teams/" + team.id + "/appearance",
                        child: t("edit"),
                      }}
                    />
                  </div>
                </div>
              )
          )}
        </>
      )}
    </ul>
  );
}
