import { useState } from "react";

import { ORG_SELF_SERVE_ENABLED } from "@calcom/lib/constants";
import { trackFormbricksAction } from "@calcom/lib/formbricks-client";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Card, showToast } from "@calcom/ui";
import { UserPlus, Building, LineChart, Paintbrush, Users, Edit } from "@calcom/ui/components/icon";

import TeamListItem from "./TeamListItem";

interface Props {
  teams: RouterOutputs["viewer"]["teams"]["list"];
  /**
   * True for teams that are pending invite acceptance
   */
  pending?: boolean;
}

export default function TeamList(props: Props) {
  const utils = trpc.useUtils();

  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

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
      trackFormbricksAction("team_disbanded");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  function deleteTeam(teamId: number) {
    deleteTeamMutation.mutate({ teamId });
  }

  if (!user) return null;
  const isUserAlreadyInAnOrganization = user.profile.organization;
  return (
    <ul className="bg-default divide-subtle border-subtle mb-2 divide-y overflow-hidden rounded-md border">
      {ORG_SELF_SERVE_ENABLED &&
        !props.pending &&
        !isUserAlreadyInAnOrganization &&
        props.teams.length > 2 &&
        props.teams.map(
          (team, i) =>
            team.role !== "MEMBER" &&
            i === 0 && (
              <div className="bg-subtle p-4">
                <div className="grid-col-1 grid gap-2 md:grid-cols-3">
                  <Card
                    icon={<Building className="h-5 w-5 text-red-700" />}
                    variant="basic"
                    title={t("You have a lot of teams")}
                    description={t(
                      "Consider consolidating your teams in an organisation, unify billing, admin tools and analytics."
                    )}
                    actionButton={{
                      href: `/settings/organizations/new`,
                      child: t("set_up_your_organization"),
                      "data-testId": "setup_your_org_action_button",
                    }}
                  />
                  <Card
                    icon={<Paintbrush className="h-5 w-5 text-orange-700" />}
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
                    icon={<LineChart className="h-5 w-5 text-green-700" />}
                    variant="basic"
                    title={t("Admin tools and analytics")}
                    description={t(
                      "As an organization owner, you are in charge of every team account. You can make changes with admin-only tools and see organization wide analytics in one place."
                    )}
                    actionButton={{
                      href: "https://i.cal.com/sales/enterprise",
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
                      icon={<UserPlus className="h-5 w-5 text-green-700" />}
                      variant="basic"
                      title={t("invite_team_member")}
                      description={t("meetings_are_better_with_the_right")}
                      actionButton={{
                        href: `/settings/teams/${team.id}/members`,
                        child: t("invite"),
                      }}
                    />
                    <Card
                      icon={<Users className="h-5 w-5 text-orange-700" />}
                      variant="basic"
                      title={t("collective_or_roundrobin")}
                      description={t("book_your_team_members")}
                      actionButton={{
                        href: `/event-types?dialog=new&eventPage=team%2F${team.slug}&teamId=${team.id}`,
                        child: t("create"),
                      }}
                    />
                    <Card
                      icon={<Edit className="h-5 w-5 text-purple-700" />}
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
