import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ReactNode } from "react";

import { Label } from "..";
import Switch from "./Switch";

type Props = {
  children?: ReactNode;
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  "data-testid"?: string;
  tooltip?: string;
};

function SettingsToggle({
  checked,
  onCheckedChange,
  description,
  title,
  children,
  disabled,
  tooltip,
  ...rest
}: Props) {
  const [animateRef] = useAutoAnimate<HTMLDivElement>();

  return (
    <>
      <div className="flex w-full flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
        <fieldset className="block w-full flex-col sm:flex">
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
              <Label className="text-emphasis text-sm font-semibold leading-none">{title}</Label>
              {description && <p className="text-default -mt-1.5 text-sm leading-normal">{description}</p>}
            </div>
          </div>
          {children && (
            <div className="lg:ml-14" ref={animateRef}>
              {checked && <div className="mt-4">{children}</div>}
            </div>
          )}
        </fieldset>
      </div>
    </>
  );
}

export default SettingsToggle;
