import { cn } from "@/lib/utils";
import { type FC } from "react";

import { Button } from "@calcom/ui";
import { CalendarDays } from "@calcom/ui/components/icon";

import { useAtomsContext } from "../hooks/useAtomsContext";
import { useGcal } from "../hooks/useGcal";
import { useMe } from "../hooks/useMe";

interface GcalConnectProps {
  className?: string;
  label?: string;
  alreadyConnectedLabel?: string;
}

export const GcalConnect: FC<GcalConnectProps> = ({
  label = "Connect Google Calendar",
  alreadyConnectedLabel = "Connected Google Calendar",
  className,
}) => {
  const { isAuth } = useAtomsContext();

  const user = useMe();

  console.log("this is our user", user, user?.data);

  const { allowConnect, checked, redirectToGcalOAuth } = useGcal({ isAuth });

  if (!isAuth || !checked) return <></>;

  if (!user) return <>Loading...</>;

  return (
    user && (
      <Button
        StartIcon={CalendarDays}
        color="primary"
        disabled={!allowConnect}
        className={cn("", className)}
        onClick={() => redirectToGcalOAuth()}>
        {allowConnect ? label : alreadyConnectedLabel}
      </Button>
    )
  );
};
