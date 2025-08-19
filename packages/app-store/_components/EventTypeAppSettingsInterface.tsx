import { getEventTypeSettingsMap } from "@calcom/lib/apps/registry";

import type { EventTypeAppSettingsComponentProps } from "../types";
import { DynamicComponent } from "./DynamicComponent";

export const EventTypeAppSettings = (props: EventTypeAppSettingsComponentProps) => {
  const { slug, ...rest } = props;
  return <DynamicComponent slug={slug} componentMap={getEventTypeSettingsMap()} {...rest} />;
};
