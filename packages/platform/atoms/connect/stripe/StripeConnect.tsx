import type { FC } from "react";

import { Button } from "@calcom/ui";

import type { OnCheckErrorType, UseCheckProps } from "../../hooks/connect/useCheck";
import { useCheck } from "../../hooks/stripe/useCheck";
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
  initialData: UseCheckProps["initialData"];
};

export const StripeConnect: FC<Partial<StripeConnectProps>> = ({
  label = "Connect to Stripe",
  className,
  redir,
  onCheckError,
  initialData,
}) => {
  const { connect } = useConnect(redir);
  const { allowConnect, checked } = useCheck({
    onCheckError,
    initialData,
  });

  const displayedLabel = label;

  const isChecking = !checked;
  const isDisabled = isChecking || !allowConnect;

  return (
    <AtomsWrapper>
      <Button
        StartIcon="calendar"
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
