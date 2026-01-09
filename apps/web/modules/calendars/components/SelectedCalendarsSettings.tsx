import type { ReactNode } from "react";

import cn from "@calcom/ui/classNames";

export const SelectedCalendarsSettings = (props: { children: ReactNode; classNames?: string }) => {
  return <div className={cn("border-subtle mt-6 rounded-lg border", props.classNames)}>{props.children}</div>;
};
