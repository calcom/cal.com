import type { FC } from "react";

import { OFFICE_365_CALENDAR } from "@calcom/platform-constants";

import type { OAuthConnectProps } from "../OAuthConnect";
import { OAuthConnect } from "../OAuthConnect";

export const OutlookConnect: FC<Partial<OAuthConnectProps>> = ({
  label = "Connect Outlook Calendar",
  alreadyConnectedLabel = "Connected Outlook Calendar",
  loadingLabel = "Checking Outlook Calendar",
  className,
  onCheckError,
  redir,
}) => {
  return (
    <OAuthConnect
      label={label}
      alreadyConnectedLabel={alreadyConnectedLabel}
      loadingLabel={loadingLabel}
      calendar={OFFICE_365_CALENDAR}
      className={className}
      onCheckError={onCheckError}
      redir={redir}
    />
  );
};
