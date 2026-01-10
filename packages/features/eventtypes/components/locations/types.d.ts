import type { LocationSelectCustomClassNames } from "@calcom/features/form/components/LocationSelect";

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
