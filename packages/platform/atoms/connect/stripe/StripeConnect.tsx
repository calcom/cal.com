import type { FC } from "react";

import { Button } from "@calcom/ui";

import type { OnCheckErrorType } from "../../hooks/connect/useCheck";
import { useConnect } from "../../hooks/stripe/useConnect";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { cn } from "../../src/lib/utils";

type StripeConnectProps = {
  className?: string;
  label: string;
  alreadyConnectedLabel: string;
  loadingLabel: string;
  onCheckError?: OnCheckErrorType;
  redir?: string;
};

export const StripeConnect: FC<Partial<StripeConnectProps>> = ({ label, className, redir }) => {
  const { connect } = useConnect(redir);

  const displayedLabel = label;
  // for the time being set this to a hardcoded value
  // const isChecking = !checked;
  // const isDisabled = isChecking || !allowConnect;
  const isChecking = false;
  const isDisabled = false;

  return (
    <AtomsWrapper>
      <Button
        StartIcon="calendar"
        color="primary"
        //   disabled={isDisabled}
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
