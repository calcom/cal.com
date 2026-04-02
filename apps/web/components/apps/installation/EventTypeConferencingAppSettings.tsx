import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import type { SingleValueLocationOption } from "@calcom/features/form/components/LocationSelect";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Label } from "@calcom/ui/components/form";
import { Skeleton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import type { TFormType } from "@components/apps/installation/ConfigureStepCard";
import { QueryCell } from "@lib/QueryCell";
import { useMemo } from "react";
import type { Control, FormState, UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import type { TEventType } from "~/apps/installation/[[...step]]/step-view";
import type { TEventTypeLocation, TLocationOptions } from "~/event-types/components/locations/Locations";
import Locations from "~/event-types/components/locations/Locations";

const LocationsWrapper = ({
  eventType,
  slug,
}: {
  eventType: TEventType & {
    locationOptions?: TLocationOptions;
  };
  slug: string;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<TFormType>();

  const prefillLocation = useMemo(() => {
    let res: SingleValueLocationOption | undefined;
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

const EventTypeConferencingAppSettings = ({ eventType, slug }: { eventType: TEventType; slug: string }) => {
  const locationsQuery = trpc.viewer.apps.locationOptions.useQuery({});
  const { t } = useLocale();

  const SkeletonLoader = () => {
    return (
      <SkeletonContainer>
        <SkeletonText className="my-2 h-8 w-full" />
      </SkeletonContainer>
    );
  };

  return (
    <QueryCell
      query={locationsQuery}
      customLoader={<SkeletonLoader />}
      success={({ data }) => {
        let updatedEventType: TEventType & {
          locationOptions?: TLocationOptions;
        } = { ...eventType };

        if (updatedEventType.schedulingType === SchedulingType.MANAGED) {
          updatedEventType = {
            ...updatedEventType,
            locationOptions: [
              {
                label: t("default"),
                options: [
                  {
                    label: t("members_default_location"),
                    value: "",
                    icon: "/user-check.svg",
                  },
                ],
              },
              ...data,
            ],
          };
        } else {
          updatedEventType = { ...updatedEventType, locationOptions: data };
        }
        return <LocationsWrapper eventType={updatedEventType} slug={slug} />;
      }}
    />
  );
};

export default EventTypeConferencingAppSettings;
