"use client";

import type { FC } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { GOOGLE_CALENDAR } from "@calcom/platform-constants";

import type { OAuthConnectProps } from "../OAuthConnect";
import { OAuthConnect } from "../OAuthConnect";

export const GcalConnect: FC<Partial<OAuthConnectProps>> = ({
  label,
  alreadyConnectedLabel,
  loadingLabel,
  className,
  onCheckError,
  redir,
  initialData,
  isMultiCalendar = false,
  tooltipSide,
  tooltip,
  isClickable,
  isDryRun,
}) => {
  const { t } = useLocale();
  return (
    <OAuthConnect
      label={label || t("google_connect_atom_label")}
      alreadyConnectedLabel={alreadyConnectedLabel || t("google_connect_atom_already_connected_label")}
      loadingLabel={loadingLabel || t("google_connect_atom_loading_label")}
      calendar={GOOGLE_CALENDAR}
      className={className}
      onCheckError={onCheckError}
      redir={redir}
      initialData={initialData}
      isMultiCalendar={isMultiCalendar}
      tooltipSide={tooltipSide}
      tooltip={tooltip}
      isClickable={isClickable}
      isDryRun={isDryRun}
    />
  );
};
