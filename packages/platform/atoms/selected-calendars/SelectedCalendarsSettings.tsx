import type { ReactNode } from "react";

import { cn } from "../src/lib/utils";

export const SelectedCalendarsSettings = (props: {
  children: ReactNode;
  classNames?:
    | {
        container?: string;
        headingContainer?: string;
        headingTitle?: string;
        headingDescription?: string;
        addButtonContainer?: string;
        addButton?: string;
        calendarListContainer?: string;
        calendarItemContainer?: string;
        calendarItemTitle?: string;
        calendarItemDescription?: string;
        calendarItemActions?: string;
        calendarSwitchContainer?: string;
        calendarSwitchLabel?: string;
        disconnectButton?: string;
        noCalendarsMessage?: string;
      }
    | string;
}) => {
  const classNamesObj =
    typeof props.classNames === "string" ? { container: props.classNames } : props.classNames;
  return (
    <div className={cn("border-subtle mt-6 rounded-lg border", classNamesObj?.container)}>
      {props.children}
    </div>
  );
};
