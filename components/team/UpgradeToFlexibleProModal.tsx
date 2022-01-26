import { useState } from "react";

import { useLocale } from "@lib/hooks/useLocale";
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const utils = trpc.useContext();
  const { data } = trpc.useQuery(["viewer.teams.getTeamSeats", { teamId: props.teamId }], {
    onError: (err) => {
      setErrorMessage(err.message);
    },
  });
  const mutation = trpc.useMutation(["viewer.teams.upgradeToPerSeatPricing"], {
    onSuccess: (data) => {
      // if the user does not already have a Stripe subscription, this wi
      if (data?.url) {
        window.location.href = data.url;
      }
      if (data?.success) {
        utils.invalidateQueries(["viewer.teams.get"]);
        setSuccessMessage(t("team_upgrade_success"));
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
        <a className="underline cursor-pointer">{"Upgrade Now"}</a>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("Purchase missing seats")} />

        {successMessage && <Alert severity="success" title={successMessage} className="my-4" />}
        {!successMessage && (
          <>
            <p className="-mt-4 text-sm text-gray-600">{t("changed_team_billing_info")}</p>
            {data && (
              <p className="mt-2 text-sm italic text-gray-700">
                Of the <span className="font-bold text-black">{data.totalMembers}</span> members in your team,{" "}
                <span className="font-bold text-black">{data.missingSeats}</span> seat(s) are unpaid. At{" "}
                <span className="font-bold text-black">$12</span>/m per seat the estimated total cost of your
                membership is{" "}
                <span className="font-bold text-black">
                  ${(data.totalMembers - data.freeSeats) * 12 + 12}
                </span>
                /m.
              </p>
            )}
          </>
        )}
        {errorMessage && (
          <Alert severity="error" title={errorMessage} message={t("further_billing_help")} className="my-4" />
        )}
        <DialogFooter>
          <DialogClose>
            <Button color="secondary">Close</Button>
          </DialogClose>
          {!successMessage && (
            <Button
              disabled={mutation.isLoading}
              onClick={() => {
                setErrorMessage(null);
                mutation.mutate({ teamId: props.teamId });
              }}>
              Upgrade to Per-Seat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
