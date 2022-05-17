import React from "react";
import Select from "react-select";
import { OptionProps } from "react-select";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { App } from "@calcom/types/App";
import { Button } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";
import { trpc, inferQueryOutput } from "@lib/trpc";

interface Props {
  isLoading?: boolean;
}

const ImageOption = (props: OptionProps) => {
  const data = props.data as { [key: string]: string; type: App["type"] };
  return (
    <InstallAppButton
      type={data.type}
      render={(props) => (
        <Button {...props} color="minimal" className="w-full">
          {/* eslint-disable @next/next/no-img-element */}
          {data.image && <img className="float-left mr-3 inline h-5 w-5" src={data.image} alt={data.label} />}
          <p>{data.label}</p>
        </Button>
      )}
    />
  );
};

type AppOutput = inferQueryOutput<"viewer.integrations">["items"][0];

const AdditionalCalendarSelector = ({ isLoading }: Props): JSX.Element | null => {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { variant: "calendar" }]);
  const installedFilter = (app: AppOutput) => app.credentialIds.length > 0 || app.isGlobal;

  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        const options = data.items.filter(installedFilter).map((item) => ({
          value: item.slug,
          label: item.name,
          image: item.imageSrc,
          type: item.type,
        }));
        const customStyles = {
          // Forgive me father for I have sinned, "any" is necessary here
          placeholder: (defaultStyles: any) => {
            return {
              ...defaultStyles,
              color: "#3E3E3E",
              marginLeft: "3px",
            };
          },
        };
        return (
          <Select
            name={"additionalCalendar"}
            placeholder={t("connect_additional_calendar")}
            options={options}
            styles={customStyles}
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
