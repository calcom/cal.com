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
  // const { data: connectedCalendars, isLoading: isConnectedCalendarsLoading } = useConnectedCalendars({});
  const connectedCalendars = useConnectedCalendars({});
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
    //  console.log(connectedCalendars?.connectedCalendars, "connected calendars data");

    // if (isConnectedCalendarsLoading) {
    //   displayedLabel = loadingLabel;
    // }

    //  const calendars = connectedCalendars?.connectedCalendars;

    if (!connectedCalendars.data) return null;

    return (
      <AtomsWrapper>
        <Button
          StartIcon="calendar-days"
          color="primary"
          tooltip={
            tooltip ? tooltip : <ConnectedCalendarsTooltip connectedCalendars={connectedCalendars?.data} />
          }
          tooltipSide={tooltipSide}
          tooltipOffset={10}
          disabled={isChecking}
          className={cn("", className, isChecking && "animate-pulse", !isDisabled && "cursor-pointer")}
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

export const ConnectedCalendarsTooltip = (
  connectedCalendars: ReturnType<typeof useConnectedCalendars>["data"]
) => {
  // if (!Boolean(connectedCalendars?.connectedCalendars?.length)) return null;

  if (!connectedCalendars || connectedCalendars?.connectedCalendars?.length < 1) return null;

  console.log(
    connectedCalendars,
    "this is the connected calendars data inside of Connected alendars Tooltip component".toLocaleUpperCase()
  );
  console.log(connectedCalendars.connectedCalendars, "these are connected calendars");

  // return (
  //   <div className="bg-subtle flex flex-col rounded-md border border-gray-300">
  //     {connectedCalendars?.connectedCalendars?.map((calendar, index, arr) => {
  //       return (
  //         <>
  //           <div key={calendar.primary?.externalId} className="bg-transparent px-4 py-2 text-black">
  //             {calendar.primary?.name} - {calendar.primary?.email}
  //           </div>
  //           {arr.length - 1 !== index && <hr className="w-[93%] self-center" />}
  //         </>
  //       );
  //     })}
  //   </div>
  // );

  return <>Hello world this is the tooltip component</>;
};
