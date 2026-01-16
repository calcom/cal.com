import type React from "react";
import type { LocationItem, LocationOptionGroup } from "@/types/locations";

interface LocationsListIOSPickerProps {
  isHeader?: boolean;
  locationOptions: LocationOptionGroup[];
  locations: LocationItem[];
  onSelectOption: (value: string, label: string) => void;
  trigger: React.ReactNode;
}

export function LocationsListIOSPicker(_props: LocationsListIOSPickerProps) {
  return null;
}
