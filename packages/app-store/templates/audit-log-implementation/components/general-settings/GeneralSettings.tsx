import { useAutoAnimate } from "@formkit/auto-animate/react";
import React from "react";

import type { GeneralSettingsOption } from "@calcom/features/audit-logs/types";
import { Button } from "@calcom/ui";

import { getGeneralSettingsOptions } from "../../lib/utils";

export const GeneralSettings = () => {
  const generalSettingsOptions = getGeneralSettingsOptions();
  return (
    <div className="flex h-[100%] w-[100%] flex-col space-y-4">
      {generalSettingsOptions.map((option, key) =>
        option.component ? (
          <React.Fragment key={key}>{option.component(option)}</React.Fragment>
        ) : (
          <GeneralSettingsOptionCard option={option} key={key} />
        )
      )}
    </div>
  );
};

const GeneralSettingsOptionCard = ({ option }: { option: GeneralSettingsOption }) => {
  const [animationRef] = useAutoAnimate<HTMLDivElement>();
  return (
    <div className="border-subtle flex items-center justify-between rounded-md border">
      <div className="p-4 sm:p-4">
        <div className="flex w-full flex-col gap-2 sm:gap-0">
          <div className="text-emphasis">
            <span className="font-semi-bold text-sm">{option?.name}</span>
          </div>
          <p className="text-default line-clamp-1 pt-1 text-xs font-normal">{option?.description}</p>
        </div>
      </div>
      <div ref={animationRef} className="p-4">
        <Button>{option.button}</Button>
      </div>
    </div>
  );
};
