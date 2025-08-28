import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TimeUnit } from "@calcom/prisma/enums";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

const TIME_UNITS = [TimeUnit.DAY, TimeUnit.HOUR, TimeUnit.MINUTE] as const;

type Props = {
  disabled: boolean;
};

const TimeUnitAddonSuffix = ({
  DropdownItems,
  timeUnitOptions,
}: {
  DropdownItems: JSX.Element;
  timeUnitOptions: { [x: string]: string };
}) => {
  const formContext = useFormContext();
  const currentTimeUnit = formContext.getValues("timeUnit") || TimeUnit.MINUTE;
  const dropdownState = useState(false);
  const [dropdownOpen, setDropdownOpen] = dropdownState;

  const handleOpenChange = (openState: boolean) => {
    setDropdownOpen(openState);
  };

  const ChevronIcon = () => {
    const iconName = dropdownOpen ? "chevron-up" : "chevron-down";
    return <Icon name={iconName} />;
  };

  const TriggerButton = () => (
    <button className="flex items-center">
      <div className="mr-1 w-3/5">{currentTimeUnit ? timeUnitOptions[currentTimeUnit] : "undefined"}</div>
      <div className="w-1/4 pt-1">
        <ChevronIcon />
      </div>
    </button>
  );

  return (
    <Dropdown onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <TriggerButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent>{DropdownItems}</DropdownMenuContent>
    </Dropdown>
  );
};

export const TimeTimeUnitInput = (props: Props) => {
  const formInstance = useFormContext();
  const localeHook = useLocale();
  const translate = localeHook.t;

  const buildTimeUnitOptions = () => {
    const options: { [x: string]: string } = {};

    TIME_UNITS.forEach((unit) => {
      const translationKey = `${unit.toLowerCase()}_timeUnit`;
      options[unit] = translate(translationKey);
    });

    return options;
  };

  const timeUnitLabels = buildTimeUnitOptions();

  const createDropdownItems = () => {
    const menuItems = TIME_UNITS.map((unit, idx) => {
      const handleSelection = () => {
        formInstance.setValue("timeUnit", unit, { shouldDirty: true });
      };

      return (
        <DropdownMenuItem key={idx} className="outline-none">
          <DropdownItem key={idx} type="button" onClick={handleSelection}>
            {timeUnitLabels[unit]}
          </DropdownItem>
        </DropdownMenuItem>
      );
    });

    return <>{menuItems}</>;
  };

  const InputField = () => {
    const fieldProps = {
      type: "number" as const,
      min: "1",
      label: "",
      disabled: props.disabled,
      defaultValue: formInstance.getValues("time") || 24,
      className: "-mt-2 rounded-r-none text-sm focus:ring-0",
    };

    const registrationConfig = { valueAsNumber: true };
    const fieldRegistration = formInstance.register("time", registrationConfig);

    const suffixComponent = (
      <TimeUnitAddonSuffix timeUnitOptions={timeUnitLabels} DropdownItems={createDropdownItems()} />
    );

    return <TextField {...fieldProps} {...fieldRegistration} addOnSuffix={suffixComponent} />;
  };

  const containerClass = "flex";
  const inputWrapperClass = "grow";

  return (
    <div className={containerClass}>
      <div className={inputWrapperClass}>
        <InputField />
      </div>
    </div>
  );
};
