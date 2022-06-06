import React from "react";
import Select from "react-select";
import { OptionProps } from "react-select";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import { Button } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

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
  const query = trpc.useQuery(["viewer.integrations", { variant: "calendar", onlyInstalled: true }]);

  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        const options = data.items.map((item) => ({
          label: item.name,
          slug: item.slug,
          image: item.imageSrc,
          type: item.type,
        }));
        return (
          <Select
            name={"additionalCalendar"}
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
            }}
            isSearchable={false}
            className="mt-1 mb-2 block w-full min-w-0 flex-1 rounded-none rounded-r-md border-gray-300 font-medium text-gray-700 sm:text-sm"
            isLoading={isLoading}
            components={{ Option: ImageOption }}
          />
        );
      }}
    />
  );
};

export default AdditionalCalendarSelector;
