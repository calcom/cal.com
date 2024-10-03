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
  isClickable?: boolean;
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
  isClickable,
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
          disabled={isClickable ? false : isChecking}
          tooltip={tooltip ? tooltip : <ConnectedCalendarsTooltip calendarInstance={calendar} />}
          tooltipSide={tooltipSide}
          tooltipOffset={10}
          className={cn("", !isDisabled && "cursor-pointer", className)}
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
          isChecking && "animate-pulse",
          isDisabled && "cursor-not-allowed",
          !isDisabled && "cursor-pointer",
          className
        )}
        onClick={() => connect()}>
        {displayedLabel}
      </Button>
    </AtomsWrapper>
  );
};

export const ConnectedCalendarsTooltip = ({
  calendarInstance,
}: {
  calendarInstance: (typeof CALENDARS)[number];
}) => {
  const { data: connectedCalendars, isLoading: isConnectedCalendarsLoading } = useConnectedCalendars({});

  if (isConnectedCalendarsLoading)
    return (
      <div className="bg-subtle flex flex-col rounded-md border border-gray-300 px-4 py-2">Loading...</div>
    );

  return (
    <div className="bg-subtle flex flex-col rounded-md border border-gray-300">
      {connectedCalendars?.connectedCalendars
        .filter((calendar) => calendar.integration.slug === `${calendarInstance}-calendar`)
        .map((calendar, index, arr) => {
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
