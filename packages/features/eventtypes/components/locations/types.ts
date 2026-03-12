import type { LocationSelectCustomClassNames } from "@calcom/features/form/components/LocationSelect";
import type { EventTypeSetupProps, LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import type { Control, FormState, UseFormGetValues, UseFormSetValue } from "react-hook-form";

export type LocationCustomClassNames = {
  container?: string;
  locationSelect?: LocationSelectCustomClassNames;
  removeLocationButton?: string;
  removeLocationIcon?: string;
  addLocationButton?: string;
  organizerContactInput?: {
    errorMessage?: string;
    locationInput?: LocationInputCustomClassNames;
    publicDisplayCheckbox?: CheckboxClassNames;
  };
};

export type LocationInputCustomClassNames = {
  addressInput?: string;
  phoneInput?: string;
};

export type CheckboxClassNames = {
  container?: string;
  label?: string;
  checkbox?: string;
};

export type LocationsSlotProps = {
  team: { id: number } | null;
  destinationCalendar: { integration: string } | null;
  showAppStoreLink: boolean;
  isChildrenManagedEventType?: boolean;
  isManagedEventType?: boolean;
  disableLocationProp?: boolean;
  getValues: UseFormGetValues<LocationFormValues>;
  setValue: UseFormSetValue<LocationFormValues>;
  control: Control<LocationFormValues>;
  formState: FormState<LocationFormValues>;
  eventType: Pick<EventTypeSetupProps["eventType"], "locations" | "calVideoSettings">;
  locationOptions: EventTypeSetupProps["locationOptions"];
  customClassNames?: LocationCustomClassNames;
};

export type HostLocationsSlotProps = {
  eventTypeId: number;
  locationOptions: EventTypeSetupProps["locationOptions"];
};
