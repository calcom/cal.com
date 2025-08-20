import { getEventTypeSettingsMap } from "@calcom/lib/apps/registry";

import type { EventTypeAppSettingsComponentProps } from "../types";
import AsyncDynamicComponent from "./AsyncDynamicComponent";

export const EventTypeAppSettings = (props: EventTypeAppSettingsComponentProps) => {
  const { slug, ...rest } = props;
  return <AsyncDynamicComponent slug={slug} componentMapPromise={getEventTypeSettingsMap()} {...rest} />;
};
