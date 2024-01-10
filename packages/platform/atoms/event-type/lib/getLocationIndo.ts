import type { EventTypeSetupProps } from "event-type/tabs/event-setup";

type IOpProps = {
  label: string;
  options: {
    label: string;
    value: string;
    disabled?: boolean | undefined;
    icon?: string | undefined;
    slug?: string | undefined;
  }[];
};

type IOptProps = {
  label: string;
  value: string;
  disabled?: boolean | undefined;
  icon?: string | undefined;
  slug?: string | undefined;
};

const getLocationInfo = (props: Pick<EventTypeSetupProps, "eventType" | "locationOptions">) => {
  const locationAvailable =
    props.eventType.locations &&
    props.eventType.locations.length > 0 &&
    props.locationOptions.some((op: IOpProps) =>
      op.options.find((opt: IOptProps) => opt.value === props.eventType.locations[0].type)
    );

  const locationDetails = props.eventType.locations &&
    props.eventType.locations.length > 0 &&
    !locationAvailable && {
      slug: props.eventType.locations[0].type
        .replace("integrations:", "")
        .replace(":", "-")
        .replace("_video", ""),
      name: props.eventType.locations[0].type
        .replace("integrations:", "")
        .replace(":", " ")
        .replace("_video", "")
        .split(" ")
        .map((word: string) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
    };

  return { locationAvailable, locationDetails };
};

export default getLocationInfo;
