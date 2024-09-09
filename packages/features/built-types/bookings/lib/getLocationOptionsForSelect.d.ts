import type { LocationObject } from "@calcom/app-store/locations";
import type { useLocale } from "@calcom/lib/hooks/useLocale";
export default function getLocationsOptionsForSelect(locations: LocationObject[], t: ReturnType<typeof useLocale>["t"]): {
    label: string;
    value: string;
    inputPlaceholder: string;
}[];
//# sourceMappingURL=getLocationOptionsForSelect.d.ts.map