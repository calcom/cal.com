import type { FC } from "react";

import { GOOGLE_CALENDAR } from "@calcom/platform-constants";

import type { OAuthConnectProps } from "../OAuthConnect";
import { OAuthConnect } from "../OAuthConnect";

export const GcalConnect: FC<Partial<OAuthConnectProps>> = ({
  label = "Connect Google Calendar",
  alreadyConnectedLabel = "Connected Google Calendar",
  loadingLabel = "Checking Google Calendar",
  className,
  onCheckError,
  redir,
}) => {
  return (
    <OAuthConnect
      label={label}
      alreadyConnectedLabel={alreadyConnectedLabel}
      loadingLabel={loadingLabel}
      calendar={GOOGLE_CALENDAR}
      className={className}
      onCheckError={onCheckError}
      redir={redir}
    />
  );
};
