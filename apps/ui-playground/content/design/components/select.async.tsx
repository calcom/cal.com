"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useCallback, useState } from "react";

import { Select } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const countries = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
  { value: "it", label: "Italy" },
  { value: "es", label: "Spain" },
  { value: "au", label: "Australia" },
  { value: "jp", label: "Japan" },
  { value: "br", label: "Brazil" },
];

// Simulate an API call with delay
const searchCountries = (query: string) => {
  return new Promise<{ value: string; label: string }[]>((resolve) => {
    setTimeout(() => {
      const filtered = countries.filter((country) =>
        country.label.toLowerCase().includes(query.toLowerCase())
      );
      resolve(filtered);
    }, 1000); // Simulate network delay
  });
};

export const AsyncExample: React.FC = () => {
  const [asyncOptions, setAsyncOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleValueChange = (newValue: unknown, actionMeta: { action: string }) => {
    showToast(`Selected: ${JSON.stringify(newValue)}, Action: ${actionMeta.action}`, "success");
  };

  const loadOptions = useCallback(async (inputValue: string) => {
    setIsLoading(true);
    try {
      const results = await searchCountries(inputValue);
      setAsyncOptions(results);
    } catch (error) {
      showToast("Error loading options", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <RenderComponentWithSnippet>
      <div className="space-y-4 md:w-80">
        <Select
          options={asyncOptions}
          onInputChange={(value) => {
            if (value) {
              loadOptions(value);
            }
          }}
          isLoading={isLoading}
          placeholder="Search for a country..."
          noOptionsMessage={({ inputValue }) =>
            inputValue ? "No countries found" : "Start typing to search..."
          }
          onChange={handleValueChange}
        />
        <Select
          options={asyncOptions}
          onInputChange={(value) => {
            if (value) {
              loadOptions(value);
            }
          }}
          isLoading={isLoading}
          placeholder="Search for a country... (small)"
          noOptionsMessage={({ inputValue }) =>
            inputValue ? "No countries found" : "Start typing to search..."
          }
          onChange={handleValueChange}
          size="sm"
        />
      </div>
    </RenderComponentWithSnippet>
  );
};
