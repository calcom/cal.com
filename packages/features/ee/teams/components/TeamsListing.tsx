import { useState, useMemo } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, ButtonGroup, Label } from "@calcom/ui";
import { Users, RefreshCcw, UserPlus, Mail, Video, EyeOff } from "@calcom/ui/components/icon";

import { UpgradeTip } from "../../../tips";
import SkeletonLoaderTeamList from "./SkeletonloaderTeamList";
import TeamList from "./TeamList";

export function TeamsListing() {
  const { t } = useLocale();
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading } = trpc.viewer.teams.list.useQuery(undefined, {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  const teams = useMemo(() => data?.filter((m) => m.accepted) || [], [data]);
  const invites = useMemo(() => data?.filter((m) => !m.accepted) || [], [data]);

  const features = [
    {
      icon: <Users className="h-5 w-5 text-red-500" />,
      title: t("collective_scheduling"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <RefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("round_robin"),
      description: t("find_the_best_person"),
    },
    {
      icon: <UserPlus className="h-5 w-5 text-green-500" />,
      title: t("fixed_round_robin"),
      description: t("add_one_fixed_attendee"),
    },
    {
      icon: <Mail className="h-5 w-5 text-orange-500" />,
      title: t("sms_attendee_action"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <Video className="h-5 w-5 text-purple-500" />,
      title: "Cal Video" + " " + t("recordings_title"),
      description: t("upgrade_to_access_recordings_description"),
    },
    {
      icon: <EyeOff className="h-5 w-5 text-indigo-500" />,
      title: t("disable_cal_branding", { appName: APP_NAME }),
      description: t("disable_cal_branding_description", { appName: APP_NAME }),
    },
  ];

  if (isLoading) {
    return <SkeletonLoaderTeamList />;
  }

  return (
    <>
      {!!errorMessage && <Alert severity="error" title={errorMessage} />}

      <UpgradeTip
        title="calcom_is_better_with_team"
        description="add_your_team_members"
        features={features}
        background="/tips/teams"
        buttons={
          <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
            <ButtonGroup>
              <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                {t("create_team")}
              </Button>
              <Button color="minimal" href="https://go.cal.com/teams-video" target="_blank">
                {t("learn_more")}
              </Button>
            </ButtonGroup>
          </div>
        }>
        <>
          {invites.length > 0 && (
            <div className="bg-subtle mb-6 rounded-md p-5">
              <Label className=" text-emphasis pb-2 font-semibold">{t("pending_invites")}</Label>
              <TeamList teams={invites} pending />
            </div>
          )}
          {teams.length > 0 && <TeamList teams={teams} />}
        </>
      </UpgradeTip>
    </>
  );
}
