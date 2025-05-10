"use client";

import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon";

export const IconGrid = (props: {
  title: string;
  icons: IconName[];
  rootClassName?: string;
  iconClassName?: string;
}) => (
  <div className={props.rootClassName}>
    <h2 className="font-cal mt-6 text-lg font-medium">{props.title}</h2>
    <div className="grid grid-cols-2 lg:grid-cols-6">
      {props.icons.map((icon) => {
        return (
          <div key={icon} className="flex items-center gap-1">
            <Icon name={icon} className={props.iconClassName} />
            <div>{icon}</div>
          </div>
        );
      })}
    </div>
  </div>
);
