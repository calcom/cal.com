import type { FC } from "react";
import React from "react";

import { EventTypeAppSettings } from "@calcom/app-store/_components/EventTypeAppSettingsInterface";
import type { EventTypeAppSettingsComponentProps, EventTypeModel } from "@calcom/app-store/types";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, StepCard } from "@calcom/ui";

import useAppsData from "@lib/hooks/useAppsData";

export type ConfigureEventTypeProp = EventTypeAppSettingsComponentProps["eventType"] &
  Pick<EventTypeModel, "metadata" | "schedulingType">;

type ConfigureStepCardProps = {
  slug: string;
  eventType: ConfigureEventTypeProp;
  onSave: (data: Record<string, unknown>) => void;
  loading?: boolean;
};

export const ConfigureStepCard: FC<ConfigureStepCardProps> = ({ slug, eventType, onSave, loading }) => {
  const { t } = useLocale();
  const { getAppDataGetter, getAppDataSetter } = useAppsData();
  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  const data = getAppDataGetter(slug as EventTypeAppsList)("") as Record<string, unknown>;
  return (
    <StepCard>
      <EventTypeAppSettings
        slug={slug}
        disabled={shouldLockDisableProps("apps").disabled}
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
