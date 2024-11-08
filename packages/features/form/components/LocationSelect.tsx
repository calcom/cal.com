import type { GroupBase, Props, SingleValue } from "react-select";
import { components } from "react-select";

import type { EventLocationType } from "@calcom/app-store/locations";
import { useIsPlatform } from "@calcom/atoms/monorepo";
import { classNames } from "@calcom/lib";
import invertLogoOnDark from "@calcom/lib/invertLogoOnDark";
import { Select, Icon } from "@calcom/ui";

export type locationSelectCustomClassnames = {
  optionIcon?: string;
  optionLabel?: string;
  optionWrapper?: string;
  groupLabel?: string;
  selectWrapper?: string;
};

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
  address?: string;
  credentialId?: number;
  teamName?: string;
  customClassnames?: locationSelectCustomClassnames;
};

export type SingleValueLocationOption = SingleValue<LocationOption>;

export type GroupOptionType = GroupBase<LocationOption>;

const OptionWithIcon = ({
  icon,
  label,
  value,
  customClassnames,
}: {
  icon?: string;
  label: string;
  value: string;
  customClassnames?: locationSelectCustomClassnames;
}) => {
  const isPlatform = useIsPlatform();

  const getIconFromValue = (value: string) => {
    switch (value) {
      case "phone":
        return <Icon name="phone" className={classNames("h-3.5 w-3.5", customClassnames?.optionIcon)} />;
      case "userPhone":
        return <Icon name="phone" className={classNames("h-3.5 w-3.5", customClassnames?.optionIcon)} />;
      case "inPerson":
        return <Icon name="map-pin" className={classNames("h-3.5 w-3.5", customClassnames?.optionIcon)} />;
      case "attendeeInPerson":
        return <Icon name="map-pin" className={classNames("h-3.5 w-3.5", customClassnames?.optionIcon)} />;
      case "link":
        return <Icon name="link" className={classNames("h-3.5 w-3.5", customClassnames?.optionIcon)} />;
      case "somewhereElse":
        return <Icon name="map" className={classNames("h-3.5 w-3.5", customClassnames?.optionIcon)} />;
      default:
        return <Icon name="video" className={classNames("h-3.5 w-3.5", customClassnames?.optionIcon)} />;
    }
  };

  if (isPlatform) {
    return (
      <div className={classNames("flex items-center gap-3", customClassnames?.optionWrapper)}>
        {getIconFromValue(value)}
        <span className={classNames("text-sm font-medium", customClassnames?.optionLabel)}>{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {icon && <img src={icon} alt="cover" className={classNames("h-3.5 w-3.5", invertLogoOnDark(icon))} />}
      <span className={classNames(" text-sm font-medium")}>{label}</span>
    </div>
  );
};

export default function LocationSelect({
  customClassnames,
  ...props
}: Props<LocationOption, false, GroupOptionType> & { customClassnames?: locationSelectCustomClassnames }) {
  const isPlatform = useIsPlatform();
  return (
    <Select<LocationOption>
      name="location"
      id="location-select"
      data-testid="location-select"
      components={{
        Option: (props) => {
          return (
            <components.Option {...props}>
              <div data-testid={`location-select-item-${props.data.value}`}>
                <OptionWithIcon
                  icon={props.data.icon}
                  label={props.data.label}
                  value={props.data.value}
                  customClassnames={customClassnames}
                />
              </div>
            </components.Option>
          );
        },
        SingleValue: (props) => {
          return (
            <components.SingleValue {...props}>
              <div data-testid={`location-select-item-${props.data.value}`}>
                <OptionWithIcon
                  icon={props.data.icon}
                  label={props.data.label}
                  value={props.data.value}
                  customClassnames={customClassnames}
                />
              </div>
            </components.SingleValue>
          );
        },
      }}
      formatOptionLabel={(e, d) => (
        <div className="flex items-center gap-3">
          {e.icon && !isPlatform && (
            <img
              src={e.icon}
              alt="app-icon"
              className={classNames(e.icon.includes("-dark") && "dark:invert", "h-5 w-5")}
            />
          )}
          <span>{e.label}</span>
        </div>
      )}
      formatGroupLabel={(e) => (
        <p className={classNames("text-default text-xs font-medium", customClassnames?.groupLabel)}>
          {e.label}
        </p>
      )}
      {...props}
    />
  );
}
