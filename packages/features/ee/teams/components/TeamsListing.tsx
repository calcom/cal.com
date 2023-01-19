import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import isCalcom from "@calcom/lib/isCalcom";
import { trpc } from "@calcom/trpc/react";
import { Alert, Button, ButtonGroup, EmptyScreen, Icon } from "@calcom/ui";

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

  const teams = data?.filter((m) => m.accepted) || [];
  const invites = data?.filter((m) => !m.accepted) || [];
  const features = [
    {
      icon: <Icon.FiUsers className="h-5 w-5 text-red-500" />,
      title: t("collective_scheduling"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <Icon.FiRefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("round_robin"),
      description: t("find_the_best_person"),
    },
    {
      icon: <Icon.FiUserPlus className="h-5 w-5 text-green-500" />,
      title: t("fixed_round_robin"),
      description: t("add_one_fixed_attendee"),
    },
    {
      icon: <Icon.FiMail className="h-5 w-5 text-orange-500" />,
      title: t("sms_attendee_action"),
      description: t("make_it_easy_to_book"),
    },
    {
      icon: <Icon.FiVideo className="h-5 w-5 text-purple-500" />,
      title: "Cal Video" + " " + t("recordings_title"),
      description: t("upgrade_to_access_recordings_description"),
    },
    {
      icon: <Icon.FiEyeOff className="h-5 w-5 text-indigo-500" />,
      title: t("disable_cal_branding", { appName: APP_NAME }),
      description: t("disable_cal_branding_description", { appName: APP_NAME }),
    },
  ];

  return (
    <>
      {!!errorMessage && <Alert severity="error" title={errorMessage} />}
      {invites.length > 0 && (
        <div className="mb-4">
          <h1 className="mb-2 text-lg font-medium">{t("open_invitations")}</h1>
          <TeamList teams={invites} />
        </div>
      )}

      {isLoading && <SkeletonLoaderTeamList />}

      <UpgradeScreen
        title="calcom_is_better_with_team"
        description="add_your_team_members"
        features={features}
        background="/team-banner-background.jpg"
        buttons={
          <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
            <ButtonGroup>
              <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                {t("create_team")}
              </Button>
              <Button color="secondary" href="https://go.cal.com/teams-video" target="_blank">
                {t("learn_more")}
              </Button>
            </ButtonGroup>
          </div>
        }>
        <>
          <EmptyScreen
            Icon={Icon.FiUsers}
            headline={t("no_teams")}
            description={t("no_teams_description")}
            buttonRaw={
              <Button color="secondary" href={`${WEBAPP_URL}/settings/teams/new`}>
                {t("create_team")}
              </Button>
            }
          />
          {teams.length > 0 && <TeamList teams={teams} />}
        </>
      </UpgradeScreen>
    </>
  );
}

function UpgradeScreen({
  title,
  description,
  background,
  features,
  buttons,
  children,
}: {
  title: string;
  description: string;
  background: string;
  features: Array<{ icon: JSX.Element; title: string; description: string }>;
  buttons?: JSX.Element;
  children: JSX.Element;
}) {
  const { data, isLoading } = trpc.viewer.teams.list.useQuery(undefined, {});
  const teams = data?.filter((m) => m.accepted) || [];
  const { t } = useLocale();

  return (
    <>
      {!teams.length && !isLoading && (
        <>
          {!isCalcom ? (
            <div className="-mt-6 rtl:ml-4 md:rtl:ml-0">
              <div
                className="flex w-full justify-between overflow-hidden rounded-lg pt-4 pb-10 md:min-h-[295px] md:pt-10"
                style={{
                  background: "url(" + background + ")",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                }}>
                <div className="mt-3 px-8 sm:px-14">
                  <h1 className="font-cal text-3xl">{t(title)}</h1>
                  <p className="my-4 max-w-sm text-gray-600">{t(description)}</p>
                  {buttons}
                </div>
              </div>
              <div className="mt-4 grid-cols-3 md:grid md:gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="mb-4 min-h-[180px] w-full rounded-md bg-gray-50 p-8 md:mb-0">
                    {feature.icon}
                    <h2 className="font-cal mt-4 text-lg">{feature.title}</h2>
                    <p className="text-gray-700">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            children
          )}
        </>
      )}
    </>
  );
}
