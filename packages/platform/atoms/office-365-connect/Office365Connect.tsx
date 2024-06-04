import type { OnCheckErrorType } from "hooks/useGcal";
import type { FC } from "react";

import { Button } from "@calcom/ui";

import { useAtomsContext } from "../hooks/useAtomsContext";
import { useOffice365Calendar } from "../hooks/useOffice365Calendar";
import { AtomsWrapper } from "../src/components/atoms-wrapper";
import { cn } from "../src/lib/utils";

interface Office365ConnectProps {
  className?: string;
  label?: string;
  alreadyConnectedLabel?: string;
  onCheckError?: OnCheckErrorType;
}

export const Office365Connect: FC<Office365ConnectProps> = ({
  label = "Connect Microsoft Outlook Calendar",
  alreadyConnectedLabel = "Connected Outlook Calendar",
  className,
  onCheckError,
}) => {
  const { isAuth } = useAtomsContext();

  const { allowConnect, checked, redirectToOffice365OAuth } = useOffice365Calendar({
    isAuth,
    onCheckError,
  });

  if (!isAuth || !checked) return <></>;

  return (
    <AtomsWrapper>
      <Button
        StartIcon="calendar-days"
        color="primary"
        disabled={!allowConnect}
        className={cn("", className)}
        onClick={() => redirectToOffice365OAuth()}>
        {allowConnect ? label : alreadyConnectedLabel}
      </Button>
    </AtomsWrapper>
  );
};
