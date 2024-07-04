import type { FC } from "react";

import type { CALENDARS } from "@calcom/platform-constants";
import { Button } from "@calcom/ui";

import type { OnCheckErrorType } from "../hooks/connect/useCheck";
import { useCheck } from "../hooks/connect/useCheck";
import { useConnect } from "../hooks/connect/useConnect";
import { AtomsWrapper } from "../src/components/atoms-wrapper";
import { cn } from "../src/lib/utils";

export type OAuthConnectProps = {
  className?: string;
  label: string;
  alreadyConnectedLabel: string;
  loadingLabel: string;
  onCheckError?: OnCheckErrorType;
  redir?: string;
};

export const OAuthConnect: FC<OAuthConnectProps & { calendar: (typeof CALENDARS)[number] }> = ({
  label,
  alreadyConnectedLabel,
  loadingLabel,
  className,
  onCheckError,
  calendar,
  redir,
}) => {
  const { connect } = useConnect(calendar, redir);

  const { allowConnect, checked } = useCheck({
    onCheckError,
    calendar: calendar,
  });

  const isChecking = !checked;
  const isDisabled = isChecking || !allowConnect;

  let displayedLabel = label;

  if (isChecking) {
    displayedLabel = loadingLabel;
  } else if (!allowConnect) {
    displayedLabel = alreadyConnectedLabel;
  }

  return (
    <AtomsWrapper>
      <Button
        StartIcon="calendar-days"
        color="primary"
        disabled={isDisabled}
        className={cn(
          "",
          className,
          isChecking && "animate-pulse",
          isDisabled && "cursor-not-allowed",
          !isDisabled && "cursor-pointer"
        )}
        onClick={() => connect()}>
        {displayedLabel}
      </Button>
    </AtomsWrapper>
  );
};
