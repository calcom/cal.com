import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeUnit } from "@calcom/prisma/enums";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  TextField,
} from "@calcom/ui";

import type { FormValues } from "../pages/workflow";

const TIME_UNITS = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as const;

type Props = {
  form: UseFormReturn<FormValues>;
  disabled: boolean;
};

const TimeUnitAddonSuffix = ({
  DropdownItems,
  timeUnitOptions,
  form,
}: {
  form: UseFormReturn<FormValues>;
  DropdownItems: JSX.Element;
  timeUnitOptions: { [x: string]: string };
}) => {
  // because isDropdownOpen already triggers a render cycle we can use getValues()
  // instead of watch() function
  const timeUnit = form.getValues("timeUnit");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  return (
    <Dropdown onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center">
          <div className="mr-1 w-3/5">{timeUnit ? timeUnitOptions[timeUnit] : "undefined"}</div>
          <div className="w-1/4 pt-1">
            {isDropdownOpen ? <Icon name="chevron-up" /> : <Icon name="chevron-down" />}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>{DropdownItems}</DropdownMenuContent>
    </Dropdown>
  );
};

export const TimeTimeUnitInput = (props: Props) => {
  const { form } = props;
  const { t } = useLocale();
  const timeUnitOptions = TIME_UNITS.reduce((acc, option) => {
    acc[option] = t(`${option.toLowerCase()}_timeUnit`);
    return acc;
  }, {} as { [x: string]: string });
  return (
    <div className="flex">
      <div className="grow">
        <TextField
          type="number"
          min="1"
          label=""
          disabled={props.disabled}
          defaultValue={form.getValues("time") || 24}
          className="-mt-2 rounded-r-none text-sm focus:ring-0"
          {...form.register("time", { valueAsNumber: true })}
          addOnSuffix={
            <TimeUnitAddonSuffix
              form={form}
              timeUnitOptions={timeUnitOptions}
              DropdownItems={
                <>
                  {TIME_UNITS.map((timeUnit, index) => (
                    <DropdownMenuItem key={index} className="outline-none">
                      <DropdownItem
                        key={index}
                        type="button"
                        onClick={() => {
                          form.setValue("timeUnit", timeUnit);
                        }}>
                        {timeUnitOptions[timeUnit]}
                      </DropdownItem>
                    </DropdownMenuItem>
                  ))}
                </>
              }
            />
          }
        />
      </div>
    </div>
  );
};
