import type { FC } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import type { ButtonColor } from "@calcom/ui/components/button";
import type { IconName } from "@calcom/ui/components/icon";

import type { OnCheckErrorType, UseCheckProps } from "../../hooks/connect/useCheck";
import { useCheck } from "../../hooks/stripe/useCheck";
import { useConnect } from "../../hooks/stripe/useConnect";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { cn } from "../../src/lib/utils";

type StripeConnectProps = {
  teamId?: number | null;
  icon?: IconName;
  color?: ButtonColor;
  isClickable?: boolean;
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
  teamId,
  icon,
  color,
  isClickable,
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
  let displayedLabel = label || t("stripe_connect_atom_label");

  const { connect } = useConnect(redir, errorRedir, teamId);
  const { allowConnect, checked, isLoading } = useCheck({
    onCheckError,
    onCheckSuccess,
    initialData,
    teamId,
  });

  const isDisabled = !checked || !allowConnect;

  if (!checked) {
    displayedLabel = loadingLabel || t("stripe_connect_atom_loading_label");
  } else if (!allowConnect) {
    displayedLabel = alreadyConnectedLabel || t("stripe_connect_atom_already_connected_label");
  }

  return (
    <AtomsWrapper>
      <Button
        StartIcon={!!icon ? icon : "credit-card"}
        color={!!color ? color : "primary"}
        disabled={isClickable ? false : isDisabled}
        className={cn(
          "",
          "md:rounded-md",
          className,
          isLoading && "animate-pulse bg-gray-200",
          isDisabled && "cursor-not-allowed",
          !isDisabled && "cursor-pointer"
        )}
        onClick={() => connect()}>
        {displayedLabel}
      </Button>
    </AtomsWrapper>
  );
};
