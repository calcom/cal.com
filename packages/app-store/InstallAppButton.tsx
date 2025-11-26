"use client";

import type { App } from "@calcom/types/App";

import { InstallAppButtonWithoutPlanCheck } from "./InstallAppButtonWithoutPlanCheck";
import type { InstallAppButtonProps } from "./types";

export const InstallAppButton = (
  props: {
    teamsPlanRequired?: App["teamsPlanRequired"];
    type: App["type"];
    wrapperClassName?: string;
    disableInstall?: boolean;
  } & InstallAppButtonProps
) => {
  return (
    <div className={props.wrapperClassName}>
      <InstallAppButtonWithoutPlanCheck {...props} />
    </div>
  );
};
