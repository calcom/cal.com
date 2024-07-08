import type { TEventType } from "@pages/apps/installation/[[...step]]";
import { useEffect, type FC } from "react";

import { EventTypeAppSettings } from "@calcom/app-store/_components/EventTypeAppSettingsInterface";
import type { EventTypeAppsList } from "@calcom/app-store/utils";

import useAppsData from "@lib/hooks/useAppsData";

import type { ConfigureStepCardProps } from "@components/apps/installation/ConfigureStepCard";

type EventTypeAppSettingsWrapperProps = Pick<
  ConfigureStepCardProps,
  "slug" | "userName" | "categories" | "credentialId"
> & {
  eventType: TEventType;
};

const EventTypeAppSettingsWrapper: FC<EventTypeAppSettingsWrapperProps> = ({
  slug,
  eventType,
  categories,
  credentialId,
}) => {
  const { getAppDataGetter, getAppDataSetter } = useAppsData();

  useEffect(() => {
    const appDataSetter = getAppDataSetter(slug as EventTypeAppsList, categories, credentialId);
    appDataSetter("enabled", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EventTypeAppSettings
      slug={slug}
      eventType={eventType}
      getAppData={getAppDataGetter(slug as EventTypeAppsList)}
      setAppData={getAppDataSetter(slug as EventTypeAppsList, categories, credentialId)}
    />
  );
};
export default EventTypeAppSettingsWrapper;
