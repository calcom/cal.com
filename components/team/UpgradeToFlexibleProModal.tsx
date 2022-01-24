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
import Button from "@components/ui/Button";

interface Props {
  teamId: number;
}

export function UpgradeToFlexibleProModal(props: Props) {
  const { t } = useLocale();

  const { data } = trpc.useQuery(["viewer.teams.getTeamSeats", { teamId: props.teamId }]);

  const mutation = trpc.useMutation(["viewer.teams.upgradeToPerSeatPricing"]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <a className="underline cursor-pointer">{"Upgrade Now"}</a>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title={t("Purchase missing seats")} />
        <p className="-mt-4 text-sm text-gray-600">{t("changed_team_billing_info")}</p>
        {data && (
          <p className="mt-2 text-sm italic text-gray-700">
            Of the <span className="font-bold text-black">{data.totalSeats}</span> members in your team,{" "}
            <span className="font-bold text-black">{data.unpaidSeats}</span> seat(s) are unpaid. At{" "}
            <span className="font-bold text-black">$12</span>/m per seat the estimated total cost of your
            membership is <span className="font-bold text-black">${data.unpaidSeats * 12 + 12}</span>/m.
          </p>
        )}
        <DialogFooter>
          <DialogClose>
            <Button color="secondary">Close</Button>
          </DialogClose>
          <Button onClick={() => mutation.mutate({ teamId: props.teamId })}>Upgrade to Per-Seat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
