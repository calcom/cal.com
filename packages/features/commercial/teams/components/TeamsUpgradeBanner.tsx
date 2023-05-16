import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast, TopBanner } from "@calcom/ui";

export function TeamsUpgradeBanner() {
  const { t } = useLocale();
  const router = useRouter();
  const { data } = trpc.viewer.teams.getUpgradeable.useQuery();
  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (!data) return null;
  const [membership] = data;
  if (!membership) return null;

  return (
    <TopBanner
      text={t("team_upgrade_banner_description", { teamName: membership.team.name })}
      variant="warning"
      actions={
        <button
          className="border-b border-b-black"
          onClick={() => {
            publishTeamMutation.mutate({ teamId: membership.team.id });
          }}>
          {t("team_upgrade_banner_action")}
        </button>
      }
    />
  );
}
