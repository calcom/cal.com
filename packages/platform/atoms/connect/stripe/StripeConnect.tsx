import type { FC } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
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
  errorRedir?: string;
  initialData: UseCheckProps["initialData"];
  onCheckSuccess?: () => void;
};

export const StripeConnect: FC<Partial<StripeConnectProps>> = ({
  label,
  className,
  loadingLabel,
  alreadyConnectedLabel,
  redir,
  errorRedir,
  onCheckError,
  initialData,
  onCheckSuccess,
}) => {
  const { t } = useLocale();
  const { connect } = useConnect(redir, errorRedir);
  const { allowConnect, checked } = useCheck({
    onCheckError,
    onCheckSuccess,
    initialData,
  });

  let displayedLabel = label || t("stripe_connect_atom_label");

  const isChecking = !checked;
  const isDisabled = isChecking || !allowConnect;

  if (isChecking) {
    displayedLabel = loadingLabel || t("stripe_connect_atom_loading_label");
  } else if (!allowConnect) {
    displayedLabel = alreadyConnectedLabel || t("stripe_connect_atom_already_connected_label");
  }

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
