import type { FC } from "react";

import { Button } from "@calcom/ui";

import { useAtomsContext } from "../hooks/useAtomsContext";
import type { OnCheckErroType } from "../hooks/useGcal";
import { useGcal } from "../hooks/useGcal";
import { AtomsWrapper } from "../src/components/atoms-wrapper";
import { cn } from "../src/lib/utils";

interface GcalConnectProps {
  className?: string;
  label?: string;
  alreadyConnectedLabel?: string;
  onCheckError?: OnCheckErroType;
}

/**
 * Renders a button to connect or disconnect the Google Calendar of a user.
 * @requires AccessToken - The user must be authenticated with an access token passed to CalProvider.
 * @component
 * @example
 * ```tsx
 * <GcalConnect
 *   label="Connect Google Calendar"
 *   alreadyConnectedLabel="Connected Google Calendar"
 *   className="my-button"
 * />
 * ```
 *
 *
 * @param {string} [label="Connect Google Calendar"] - The label for the connect button. Optional.
 * @param {string} [alreadyConnectedLabel="Connected Google Calendar"] - The label for the already connected button. Optional.
 * @param {string} [className] - Additional CSS class name for the button. Optional.
 * @param {OnCheckErroType} [onCheckError] - A callback function to handle errors when checking the connection status. Optional.
 * @returns {JSX.Element} The rendered component.
 */
export const GcalConnect: FC<GcalConnectProps> = ({
  label = "Connect Google Calendar",
  alreadyConnectedLabel = "Connected Google Calendar",
  className,
  onCheckError,
}) => {
  const { isAuth } = useAtomsContext();

  const { allowConnect, checked, redirectToGcalOAuth } = useGcal({
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
        onClick={() => redirectToGcalOAuth()}>
        {allowConnect ? label : alreadyConnectedLabel}
      </Button>
    </AtomsWrapper>
  );
};
