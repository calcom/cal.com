import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";

import { Label } from "..";
import Switch from "./Switch";

type Props = {
  children?: ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  LockedIcon?: React.ReactNode;
  Badge?: React.ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  "data-testid"?: string;
  tooltip?: string;
  toggleSwitchAtTheEnd?: boolean;
  childrenClassName?: string;
  switchContainerClassName?: string;
};

function SettingsToggle({
  checked,
  onCheckedChange,
  description,
  LockedIcon,
  Badge,
  title,
  children,
  disabled,
  tooltip,
  toggleSwitchAtTheEnd = false,
  childrenClassName,
  switchContainerClassName,
  ...rest
}: Props) {
  const [animateRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <>
      <div className="flex w-full flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
        <fieldset className="block w-full flex-col sm:flex">
          {toggleSwitchAtTheEnd ? (
            <div className={classNames("flex justify-between space-x-3", switchContainerClassName)}>
              <div>
                <div className="flex items-center">
                  <Label className="text-emphasis text-base font-semibold leading-none">
                    {title}
                    {LockedIcon}
                  </Label>
                  {Badge && <div className="mb-2">{Badge}</div>}
                </div>
                {description && <p className="text-default -mt-1.5 text-sm leading-normal">{description}</p>}
              </div>
              <div className="my-auto h-full">
                <Switch
                  data-testid={rest["data-testid"]}
                  fitToHeight={true}
                  checked={checked}
                  onCheckedChange={onCheckedChange}
                  disabled={disabled}
                  tooltip={tooltip}
                />
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <Switch
                data-testid={rest["data-testid"]}
                fitToHeight={true}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
                tooltip={tooltip}
              />

              <div>
                <Label className="text-emphasis text-sm font-semibold leading-none">
                  {title}
                  {LockedIcon}
                </Label>
                {description && <p className="text-default -mt-1.5 text-sm leading-normal">{description}</p>}
              </div>
            </div>
          )}
          {children && (
            <div className={classNames("lg:ml-14", childrenClassName)} ref={animateRef}>
              {checked && <div className={classNames(!toggleSwitchAtTheEnd && "mt-4")}>{children}</div>}
            </div>
          )}
        </fieldset>
      </div>
    </>
  );
}

export default SettingsToggle;
