import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { TopBanner } from "@calcom/ui/components";
import { showToast } from "@calcom/ui/v2/core";

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
  const [team] = data;
  if (!team) return null;
  return (
    <TopBanner
      text={`Hey! your team "${team.team.name}" needs to be upgraded.`}
      variant="warning"
      actions={
        <button
          className="border-b border-b-black"
          onClick={() => {
            publishTeamMutation.mutate({ teamId: team.team.id });
          }}>
          Upgrade you team here
        </button>
      }
    />
  );
}
