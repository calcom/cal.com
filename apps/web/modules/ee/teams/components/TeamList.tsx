import { useState } from "react";

import { trackFormbricksAction } from "@calcom/web/modules/formbricks/lib/trackFormbricksAction";
import {
  ORG_SELF_SERVE_ENABLED,
  ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE_HELPER_DIALOGUE,
} from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Card } from "@calcom/ui/components/card";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";

import TeamListItem from "./TeamListItem";

interface Props {
  teams: RouterOutputs["viewer"]["teams"]["list"];
  orgId: number | null;
  /**
   * True for teams that are pending invite acceptance
   */
  pending?: boolean;
}

export default function TeamList(props: Props) {
  const utils = trpc.useUtils();

  const { t } = useLocale();
  const { orgId } = props;

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
      revalidateTeamsList();
      await utils.viewer.teams.hasTeamPlan.invalidate();
      trackFormbricksAction("team_disbanded");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  return (
    <ul className="bg-default divide-subtle border-subtle mb-2 divide-y overflow-hidden rounded-md border">
      {ORG_SELF_SERVE_ENABLED &&
        !props.pending &&
        !orgId &&
        props.teams.length >= ORG_MINIMUM_PUBLISHED_TEAMS_SELF_SERVE_HELPER_DIALOGUE &&
        props.teams.map(
          (team, i) =>
            team.role !== "MEMBER" &&
            i === 0 && (
              <div className="bg-subtle p-4" key={team.id}>
                <div className="grid-col-1 grid gap-2 md:grid-cols-3">
                  <Card
                    icon={<Icon name="building" className="h-5 w-5 text-red-700" />}
                    variant="basic"
                    title={props.teams.length === 1 ? t("you_have_one_team") : t("You have a lot of teams")}
                    description={
                      props.teams.length === 1
                        ? t("consider_consolidating_one_team_org")
                        : t("consider_consolidating_multi_team_org")
                    }
                    actionButton={{
                      href: `/settings/organizations/new`,
                      child: t("set_up_your_organization"),
                      "data-testid": "setup_your_org_action_button",
                    }}
                  />
                  <Card
                    icon={<Icon name="paintbrush" className="h-5 w-5 text-orange-700" />}
                    variant="basic"
                    title={t("Get a clean subdomain")}
                    description={t(
                      "Right now, team member URLs are all over the place. Get a beautiful link and turn every email address into a scheduling link: anna@acme.com → acme.cal.com/anna"
                    )}
                    actionButton={{
                      href: "https://www.youtube.com/watch?v=G0Jd2dp7064",
                      child: t("learn_more"),
                    }}
                  />
                  <Card
                    icon={<Icon name="chart-line" className="h-5 w-5 text-green-700" />}
                    variant="basic"
                    title={t("Admin tools and analytics")}
                    description={t(
                      "As an organization owner, you are in charge of every team account. You can make changes with admin-only tools and see organization wide analytics in one place."
                    )}
                    actionButton={{
                      href: "https://go.cal.com/quote",
                      child: t("learn_more"),
                    }}
                  />
                </div>
              </div>
            )
        )}

      {props.teams.map((team) => (
        <TeamListItem
          key={team?.id as number}
          team={team}
          orgId={orgId}
          onActionSelect={(action: string) => selectAction(action, team?.id as number)}
          isPending={deleteTeamMutation.isPending}
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
                <div className="bg-subtle p-6" key={`listing${team.id}`}>
                  <h3 className="text-emphasis mb-4 text-sm font-semibold">{t("recommended_next_steps")}</h3>
                  <div className="grid-col-1 grid gap-2 md:grid-cols-3">
                    <Card
                      icon={<Icon name="user-plus" className="h-5 w-5 text-green-700" />}
                      variant="basic"
                      title={t("invite_team_member")}
                      description={t("meetings_are_better_with_the_right")}
                      actionButton={{
                        href: `/settings/teams/${team.id}/members`,
                        child: t("invite"),
                      }}
                    />
                    <Card
                      icon={<Icon name="users" className="h-5 w-5 text-orange-700" />}
                      variant="basic"
                      title={t("collective_or_roundrobin")}
                      description={t("book_your_team_members")}
                      actionButton={{
                        href: `/event-types?dialog=new&eventPage=team%2F${team.slug}&teamId=${team.id}`,
                        child: t("create"),
                      }}
                    />
                    <Card
                      icon={<Icon name="pencil" className="h-5 w-5 text-purple-700" />}
                      variant="basic"
                      title={t("appearance")}
                      description={t("appearance_description")}
                      actionButton={{
                        href: `/settings/teams/${team.id}/appearance`,
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
