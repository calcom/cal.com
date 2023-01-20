import { ReactNode } from "react";

import { classNames } from "@calcom/lib";

export function ShellSubHeading(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={classNames("mb-3 block justify-between sm:flex", props.className)}>
      <div>
        <h2 className="flex content-center items-center space-x-2 text-base font-bold leading-6 text-gray-900 rtl:space-x-reverse">
          {props.title}
        </h2>
        {props.subtitle && <p className="text-sm text-gray-500 ltr:mr-4">{props.subtitle}</p>}
      </div>
      {props.actions && <div className="mt-2 flex-shrink-0 sm:mt-0">{props.actions}</div>}
    </header>
  );
}
