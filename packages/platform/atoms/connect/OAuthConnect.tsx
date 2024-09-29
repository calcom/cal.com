"use client";

import type { ReactNode } from "react";
import type { FC } from "react";

import type { CALENDARS } from "@calcom/platform-constants";
import { Button } from "@calcom/ui";

import type { OnCheckErrorType, UseCheckProps } from "../hooks/connect/useCheck";
import { useCheck } from "../hooks/connect/useCheck";
import { useConnect } from "../hooks/connect/useConnect";
import { useConnectedCalendars } from "../hooks/useConnectedCalendars";
import { AtomsWrapper } from "../src/components/atoms-wrapper";
import { cn } from "../src/lib/utils";

export type OAuthConnectProps = {
  className?: string;
  label: string;
  alreadyConnectedLabel: string;
  loadingLabel: string;
  onCheckError?: OnCheckErrorType;
  redir?: string;
  initialData: UseCheckProps["initialData"];
  isMultiCalendar?: boolean;
  tooltip?: ReactNode;
  tooltipSide?: "top" | "bottom" | "left" | "right";
};

export const OAuthConnect: FC<
  OAuthConnectProps & {
    calendar: (typeof CALENDARS)[number];
  }
> = ({
  label,
  alreadyConnectedLabel,
  loadingLabel,
  className,
  onCheckError,
  calendar,
  redir,
  initialData,
  isMultiCalendar = false,
  tooltip,
  tooltipSide = "bottom",
}) => {
  const { connect } = useConnect(calendar, redir);
  const { allowConnect, checked } = useCheck({
    onCheckError,
    calendar: calendar,
    initialData,
  });

  const isChecking = !checked;
  const isDisabled = isChecking || !allowConnect;

  let displayedLabel = label;

  if (isChecking) {
    displayedLabel = loadingLabel;
  } else if (!allowConnect) {
    displayedLabel = alreadyConnectedLabel;
  }

  if (isMultiCalendar) {
    return (
      <AtomsWrapper>
        <Button
          StartIcon="calendar-days"
          color="primary"
          tooltip={tooltip ? tooltip : <ConnectedCalendarsTooltip />}
          tooltipSide={tooltipSide}
          tooltipOffset={10}
          disabled={isChecking}
          className={cn("", isChecking && "animate-pulse", !isDisabled && "cursor-pointer", className)}
          onClick={() => connect()}>
          {displayedLabel}
        </Button>
      </AtomsWrapper>
    );
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

export const ConnectedCalendarsTooltip = () => {
  const { data: connectedCalendars, isLoading: isConnectedCalendarsLoading } = useConnectedCalendars({});

  if (isConnectedCalendarsLoading) return null;

  return (
    <div className="bg-subtle flex flex-col rounded-md border border-gray-300">
      {connectedCalendars?.connectedCalendars.map((calendar, index, arr) => {
        return (
          <>
            <div key={calendar.primary?.externalId} className="bg-transparent px-4 py-2 text-black">
              {calendar.primary?.name} - {calendar.primary?.email}
            </div>
            {arr.length - 1 !== index && <hr className="w-[90%] self-center" />}
          </>
        );
      })}
    </div>
  );
};
