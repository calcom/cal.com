import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/Icon";
import Shell from "@calcom/ui/Shell";
import { Button, EmptyScreen } from "@calcom/ui/v2";

export default function TeamsPage() {
  const { t } = useLocale();
  const isEmpty = true;
  return (
    <Shell
      heading={t("teams")}
      subtitle={t("profile_team_description")}
      CTA={<Button href="settings/teams/new">{t("new")}</Button>}>
      {isEmpty ? (
        <EmptyScreen
          Icon={Icon.FiUsers}
          headline={t("no_teams")}
          description={t("no_teams_description")}
          buttonRaw={
            <Button href="settings/teams/new" color="secondary">
              {t("create_team")}
            </Button>
          }
        />
      ) : (
        "TODO: show list"
      )}
    </Shell>
  );
}
