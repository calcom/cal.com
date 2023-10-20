import type { FC } from "react";
import React from "react";

import { EventTypeAppSettings } from "@calcom/app-store/_components/EventTypeAppSettingsInterface";
import type { EventTypeAppSettingsComponentProps } from "@calcom/app-store/types";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import { Button, StepCard } from "@calcom/ui";

import useAppsData from "@lib/hooks/useAppsData";

export type ConfigureEventTypeProp = EventTypeAppSettingsComponentProps["eventType"];

type ConfigureStepCardProps = {
  slug: string;
  eventType: ConfigureEventTypeProp;
  onSave: (data: Record<string, unknown>) => void;
  loading?: boolean;
};

export const ConfigureStepCard: FC<ConfigureStepCardProps> = ({ slug, eventType, onSave, loading }) => {
  const { getAppDataGetter, getAppDataSetter } = useAppsData();
  const data = getAppDataGetter(slug as EventTypeAppsList)("") as Record<string, unknown>;
  return (
    <StepCard>
      <EventTypeAppSettings
        slug={slug}
        disabled={false}
        eventType={eventType}
        getAppData={getAppDataGetter(slug as EventTypeAppsList)}
        setAppData={getAppDataSetter(slug as EventTypeAppsList)}
      />
      <Button
        className="text-md mt-6 w-full justify-center"
        loading={loading}
        onClick={() => {
          onSave(data);
        }}>
        Save
      </Button>
    </StepCard>
  );
};
