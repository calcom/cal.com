import type { GroupBase, Props, SingleValue } from "react-select";
import { components } from "react-select";

import type { EventLocationType } from "@calcom/app-store/locations";
import { useIsPlatform } from "@calcom/atoms/monorepo";
import { classNames } from "@calcom/lib";
import invertLogoOnDark from "@calcom/lib/invertLogoOnDark";
import { Select, Icon } from "@calcom/ui";

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
  address?: string;
  credentialId?: number;
  teamName?: string;
};

export type SingleValueLocationOption = SingleValue<LocationOption>;

export type GroupOptionType = GroupBase<LocationOption>;

const OptionWithIcon = ({ icon, label, value }: { icon?: string; label: string; value: string }) => {
  const isPlatform = useIsPlatform();

  const getIconFromValue = (value: string) => {
    switch (value) {
      case "phone":
        return <Icon name="phone" className="h-3.5 w-3.5" />;
      case "userPhone":
        return <Icon name="phone" className="h-3.5 w-3.5" />;
      case "inPerson":
        return <Icon name="map-pin" className="h-3.5 w-3.5" />;
      case "attendeeInPerson":
        return <Icon name="map-pin" className="h-3.5 w-3.5" />;
      case "link":
        return <Icon name="link" className="h-3.5 w-3.5" />;
      case "somewhereElse":
        return <Icon name="map" className="h-3.5 w-3.5" />;
      default:
        return <Icon name="video" className="h-3.5 w-3.5" />;
    }
  };

  if (isPlatform) {
    return (
      <div className="flex items-center gap-3">
        {getIconFromValue(value)}
        <span className={classNames("text-sm font-medium")}>{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {icon && <img src={icon} alt="cover" className={classNames("h-3.5 w-3.5", invertLogoOnDark(icon))} />}
      <span className={classNames("text-sm font-medium")}>{label}</span>
    </div>
  );
};

export default function LocationSelect(props: Props<LocationOption, false, GroupOptionType>) {
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
                <OptionWithIcon icon={props.data.icon} label={props.data.label} value={props.data.value} />
              </div>
            </components.Option>
          );
        },
        SingleValue: (props) => {
          return (
            <components.SingleValue {...props}>
              <div data-testid={`location-select-item-${props.data.value}`}>
                <OptionWithIcon icon={props.data.icon} label={props.data.label} value={props.data.value} />
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
      formatGroupLabel={(e) => <p className="text-default text-xs font-medium">{e.label}</p>}
      {...props}
    />
  );
}
