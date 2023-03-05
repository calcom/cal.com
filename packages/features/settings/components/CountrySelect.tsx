import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui";
import type { SelectProps } from "@calcom/ui/form/Select";

type CountryOption = { label: string; value: string };

export default function CountrySelect({
  defaultValue,
  onChange,
  ...passThroughProps
}: Omit<SelectProps<CountryOption>, "defaultValue" | "onChange"> & {
  onChange: (newValue: string) => void;
  defaultValue: string;
}) {
  const { i18n } = useLocale();
  const { data: countries, isLoading } = trpc.viewer.public.countryList.useQuery({
    language: i18n.language,
  });
  return (
    <Select
      {...passThroughProps}
      id="country"
      isLoading={isLoading}
      defaultValue={{
        label: new Intl.DisplayNames([i18n.language], { type: "region" }).of(defaultValue) || "",
        value: defaultValue,
      }}
      options={
        countries &&
        Object.keys(countries).map((countryCode) => ({
          label: countries[countryCode].name || "",
          value: countryCode,
        }))
      }
      onChange={(event) => {
        event && onChange(event.value);
      }}
    />
  );
}
