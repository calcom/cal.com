/// <reference types="react" />
import type { UseFormGetValues, UseFormSetValue, Control, FormState } from "react-hook-form";
import type { LocationFormValues, EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { SingleValueLocationOption } from "@calcom/features/form/components/LocationSelect";
export type TEventTypeLocation = Pick<EventTypeSetupProps["eventType"], "locations">;
export type TLocationOptions = Pick<EventTypeSetupProps, "locationOptions">["locationOptions"];
export type TDestinationCalendar = {
    integration: string;
} | null;
export type TPrefillLocation = {
    credentialId?: number;
    type: string;
};
type LocationsProps = {
    team: {
        id: number;
    } | null;
    destinationCalendar: TDestinationCalendar;
    showAppStoreLink: boolean;
    isChildrenManagedEventType?: boolean;
    isManagedEventType?: boolean;
    disableLocationProp?: boolean;
    getValues: UseFormGetValues<LocationFormValues>;
    setValue: UseFormSetValue<LocationFormValues>;
    control: Control<LocationFormValues>;
    formState: FormState<LocationFormValues>;
    eventType: TEventTypeLocation;
    locationOptions: TLocationOptions;
    prefillLocation?: SingleValueLocationOption;
};
declare const Locations: React.FC<LocationsProps>;
export default Locations;
//# sourceMappingURL=Locations.d.ts.map