import type { ReactNode } from "react";

import { cn } from "../src/lib/utils";

export const SelectedCalendarsSettings = (props: { children: ReactNode; classNames?: string }) => {
  return <div className={cn("border-default mt-6 rounded-md border", props.classNames)}>{props.children}</div>;
};
