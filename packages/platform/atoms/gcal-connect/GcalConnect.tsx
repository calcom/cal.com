import type { FC } from "react";

import { Button } from "@calcom/ui";

import { useAtomsContext } from "../hooks/useAtomsContext";
import { useGcal } from "../hooks/useGcal";
import { AtomsWrapper } from "../src/components/atoms-wrapper";
import { cn } from "../src/lib/utils";

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

  const { allowConnect, checked, redirectToGcalOAuth } = useGcal({ isAuth });

  if (!isAuth || !checked) return <></>;

  return (
    <AtomsWrapper>
      <Button
        StartIcon="calendar-days"
        color="primary"
        disabled={!allowConnect}
        className={cn("", className)}
        onClick={() => redirectToGcalOAuth()}>
        {allowConnect ? label : alreadyConnectedLabel}
      </Button>
    </AtomsWrapper>
  );
};
