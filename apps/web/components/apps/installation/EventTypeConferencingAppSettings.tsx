import type { TEventType } from "@pages/apps/installation/[[...step]]";
import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import type { UseFormGetValues, UseFormSetValue, Control, FormState } from "react-hook-form";

import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Skeleton, Label } from "@calcom/ui";

import type { TFormType } from "@components/apps/installation/ConfigureStepCard";
import type { TEventTypeLocation } from "@components/eventtype/Locations";
import Locations from "@components/eventtype/Locations";
import type { SingleValueLocationOption } from "@components/ui/form/LocationSelect";

const EventTypeConferencingAppSettings = ({ eventType, slug }: { eventType: TEventType; slug: string }) => {
  const { t } = useLocale();
  const formMethods = useFormContext<TFormType>();

  const prefillLocation = useMemo(() => {
    let res: SingleValueLocationOption | undefined = undefined;
    for (const item of eventType?.locationOptions || []) {
      for (const option of item.options) {
        if (option.slug === slug) {
          res = {
            ...option,
          };
        }
      }
      return res;
    }
  }, [slug, eventType?.locationOptions]);

  return (
    <div className="mt-2">
      <Skeleton as={Label} loadingClassName="w-16" htmlFor="locations">
        {t("location")}
      </Skeleton>
      <Locations
        showAppStoreLink={false}
        isChildrenManagedEventType={false}
        isManagedEventType={false}
        disableLocationProp={false}
        eventType={eventType as TEventTypeLocation}
        destinationCalendar={eventType.destinationCalendar}
        locationOptions={eventType.locationOptions || []}
        prefillLocation={prefillLocation}
        team={null}
        getValues={formMethods.getValues as unknown as UseFormGetValues<LocationFormValues>}
        setValue={formMethods.setValue as unknown as UseFormSetValue<LocationFormValues>}
        control={formMethods.control as unknown as Control<LocationFormValues>}
        formState={formMethods.formState as unknown as FormState<LocationFormValues>}
      />
    </div>
  );
};

export default EventTypeConferencingAppSettings;
