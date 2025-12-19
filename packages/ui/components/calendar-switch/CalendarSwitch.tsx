"use client";

import type { ReactNode } from "react";
import { ArrowLeftIcon, RotateCwIcon } from "lucide-react";
import { Icon } from "../icon";

import { type ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import classNames from "@calcom/ui/classNames";

export function CalendarSwitchComponent(
  props: ICalendarSwitchProps & {
    isLoading: boolean;
    children: ReactNode;
    translations?: {
      spanText?: string;
    };
  }
) {
  const {
    externalId,
    name,
    isLoading,
    translations = {
      spanText: "Adding events to",
    },
    children,
  } = props;

  return (
    <div className={classNames("my-2 flex flex-row items-center")}>
      <div className="flex pl-2">{children}</div>
      <label className="ml-3 text-sm font-medium leading-5" htmlFor={externalId}>
        {name}
      </label>
      {!!props.destination && (
        <span className="bg-subtle text-default ml-8 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-normal sm:ml-4">
          <ArrowLeftIcon className="h-4 w-4" />
          {translations.spanText}
        </span>
      )}
      {isLoading && <RotateCwIcon className="text-muted h-4 w-4 animate-spin ltr:ml-1 rtl:mr-1" />}
    </div>
  );
}
