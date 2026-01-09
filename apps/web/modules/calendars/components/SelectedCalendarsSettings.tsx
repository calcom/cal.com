import type { ReactNode } from "react";

import classNames from "@calcom/ui/classNames";

export const SelectedCalendarsSettings = (props: { children: ReactNode; classNames?: string }) => {
  return (
    <div className={classNames("border-subtle mt-6 rounded-lg border", props.classNames)}>{props.children}</div>
  );
};
