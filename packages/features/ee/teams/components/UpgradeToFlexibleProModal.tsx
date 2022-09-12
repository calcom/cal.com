import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, Dialog, DialogContent, DialogTrigger, showToast } from "@calcom/ui/v2/core";

interface Props {
  teamId: number;
}

export function UpgradeToFlexibleProModal(props: Props) {
  const { t } = useLocale();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const utils = trpc.useContext();
  const { data } = trpc.useQuery(["viewer.teams.getTeamSeats", { teamId: props.teamId }], {
    onError: (err) => {
      setErrorMessage(err.message);
    },
  });
  const mutation = trpc.useMutation(["viewer.teams.upgradeTeam"], {
    onSuccess: (data) => {
      // if the user does not already have a Stripe subscription, this wi
      if (data?.url) {
        window.location.href = data.url;
      }
      if (data?.success) {
        utils.invalidateQueries(["viewer.teams.get"]);
        showToast(t("team_upgraded_successfully"), "success");
      }
    },
    onError: (err) => {
      setErrorMessage(err.message);
    },
  });

  function upgrade() {
    setErrorMessage(null);
    mutation.mutate({ teamId: props.teamId });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <a className="cursor-pointer underline">Upgrade Now</a>
      </DialogTrigger>
      <DialogContent
        type="creation"
        title={t("purchase_missing_seats")}
        actionText={t("upgrade_to_per_seat")}
        actionOnClick={() => upgrade()}>
        <p className="mt-6 text-sm text-gray-600">{t("changed_team_billing_info")}test</p>
        {data && (
          <p className="mt-2 text-sm italic text-gray-700">
            {t("team_upgrade_seats_details", {
              memberCount: data.totalMembers,
              unpaidCount: data.missingSeats,
              seatPrice: 12,
              totalCost: (data.totalMembers - data.freeSeats) * 12 + 12,
            })}
          </p>
        )}
        {errorMessage && (
          <Alert severity="error" title={errorMessage} message={t("further_billing_help")} className="my-4" />
        )}
      </DialogContent>
    </Dialog>
  );
}
