import { useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  DialogFooter,
  DialogHeader,
} from "@components/Dialog";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

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

  return (
    <Dialog
      onOpenChange={() => {
        setErrorMessage(null);
      }}>
      <DialogTrigger asChild>
        <a className="cursor-pointer underline">{"Upgrade Now"}</a>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("Purchase missing seats")} />

        <p className="-mt-4 text-sm text-gray-600">{t("changed_team_billing_info")}</p>
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
        <DialogFooter>
          <DialogClose>
            <Button color="secondary">{t("close")}</Button>
          </DialogClose>

          <Button
            disabled={mutation.isLoading}
            onClick={() => {
              setErrorMessage(null);
              mutation.mutate({ teamId: props.teamId });
            }}>
            {t("upgrade_to_per_seat")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
