import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { Input } from "@calcom/ui";

import { useOnClickOutside } from "@lib/hooks/useOnClickOutside";

interface LocationsAutocompleteProps {
  value: string | undefined;
  placeholder: string;
  name: string;
  required?: boolean;

  onSave: (place: string) => void;
}

function LocationsAutocomplete({
  name,
  placeholder,
  value,
  required,
  onSave,
  ...rest
}: LocationsAutocompleteProps) {
  const locationsContainerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(locationsContainerRef, () => setShowSuggestedLocations(false));
  const [location, setLocation] = useState(value || "");
  const debouncedLocation = useDebounce(location, 500);

  const [suggestedLocations, setSuggestedLocations] = useState<string[]>([]);
  const [showSuggestedLocations, setShowSuggestedLocations] = useState<boolean>(false);

  // getting places autocompletion from Google Places API
  const handlePlacesAutocomplete = useCallback(async () => {
    // if value is the same or empty, don't search
    if (debouncedLocation === value || debouncedLocation === "") {
      setSuggestedLocations([]);
      return;
    }

    const res = await fetch(`/api/location-autocomplete?place=${debouncedLocation}`);
    const places = await res.json();

    setSuggestedLocations(places);
  }, [debouncedLocation, value]);

  const saveLocation = (place: string) => {
    onSave(place);
  };

  // search for locations when the user types in the input (debounced)
  useEffect(() => {
    if (debouncedLocation) handlePlacesAutocomplete();
  }, [debouncedLocation, handlePlacesAutocomplete]);

  return (
    <div className="w-full" ref={locationsContainerRef}>
      <Input
        name={name}
        placeholder={placeholder}
        type="text"
        required={required}
        onChange={(e) => setLocation(e.target.value)}
        value={location}
        className="my-0"
        {...rest}
        onFocus={() => setShowSuggestedLocations(true)}
        onFocusCapture={() => setShowSuggestedLocations(true)}
      />

      {suggestedLocations.length > 0 && showSuggestedLocations ? (
        <div className="dark:bg-darkgray-50 border-subtle my-4 rounded-md border p-2">
          <ul className="space-y-2">
            {suggestedLocations.map((place, idx) => (
              <li
                key={`${idx}-${place}`}
                className="hover:bg-subtle flex items-center gap-x-2 rounded-md px-2 py-1">
                <Image
                  height={20}
                  width={20}
                  src="/map-pin-dark.svg"
                  alt="location icon"
                  className="inline-block h-3 w-3 dark:invert"
                />
                <button
                  data-testid={`suggested-location-${place}`}
                  className="w-full text-left text-sm"
                  onClick={() => saveLocation(place)}>
                  {place}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default LocationsAutocomplete;
