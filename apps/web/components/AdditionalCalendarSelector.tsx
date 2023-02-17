import React from "react";
import Select from "react-select";
import type { OptionProps } from "react-select";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import { Button } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";

interface AdditionalCalendarSelectorProps {
  isLoading?: boolean;
}

const ImageOption = (optionProps: OptionProps<{ [key: string]: string; type: App["type"] }>) => {
  const { data } = optionProps;
  return (
    <InstallAppButton
      type={data.type}
      render={(installProps) => {
        return (
          <Button {...installProps} className="w-full" color="minimal">
            {/* eslint-disable @next/next/no-img-element */}
            {data.image && (
              <img className="float-left mr-3 inline h-5 w-5" src={data.image} alt={data.label} />
            )}
            <p>{data.label}</p>
          </Button>
        );
      }}
    />
  );
};

const AdditionalCalendarSelector = ({ isLoading }: AdditionalCalendarSelectorProps): JSX.Element | null => {
  const { t } = useLocale();
  const query = trpc.viewer.integrations.useQuery({ variant: "calendar", onlyInstalled: true });

  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        const options = data.items.map((item) => ({
          label: item.name,
          slug: item.slug,
          image: item.logo,
          type: item.type,
        }));
        return (
          <Select
            name="additionalCalendar"
            placeholder={t("connect_additional_calendar")}
            options={options}
            styles={{
              placeholder: (defaultStyles) => {
                return {
                  ...defaultStyles,
                  color: "#3E3E3E",
                  marginLeft: "3px",
                };
              },
              control: (defaultStyles) => {
                return {
                  ...defaultStyles,
                  borderRadius: "2px",
                  "@media only screen and (min-width: 640px)": {
                    ...(defaultStyles["@media only screen and (min-width: 640px)"] as object),
                    maxWidth: "320px",
                  },
                };
              },
            }}
            isSearchable={false}
            className="mt-1 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-sm border-gray-300 text-sm font-medium text-gray-700"
            isLoading={isLoading}
            components={{ Option: ImageOption }}
          />
        );
      }}
    />
  );
};

export default AdditionalCalendarSelector;
