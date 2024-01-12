import type { EventTypeSetupProps } from "event-type/tabs/event-setup";
import type { Option } from "event-type/types";

import type { EventLocationType } from "@calcom/app-store/locations";

type getLocationFromTypeProps = {
  type: EventLocationType["type"];
  locationOptions: Pick<EventTypeSetupProps, "locationOptions">["locationOptions"];
};

const getLocationFromType = ({ type, locationOptions }: getLocationFromTypeProps) => {
  for (const locationOption of locationOptions) {
    const option = locationOption.options.find((option: Option) => option.value === type);
    if (option) {
      return option;
    }
  }
};

export default getLocationFromType;
