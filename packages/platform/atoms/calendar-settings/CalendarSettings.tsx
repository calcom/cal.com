import type { ReactNode } from "react";

export const CalendarSettings = (props: { children: ReactNode }) => {
  return <div className="border-subtle mt-6 rounded-lg border">{props.children}</div>;
};
