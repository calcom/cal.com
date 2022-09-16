import React from "react";
import Select from "react-select";
import { OptionProps } from "react-select";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import { Button } from "@calcom/ui";
import { Icon } from "@calcom/ui/Icon";

import { QueryCell } from "@lib/QueryCell";

interface AdditionalCalendarSelectorProps {
  isLoading?: boolean;
}

const ImageOption = (optionProps: OptionProps<{ [key: string]: string; type: App["type"] }>) => {
  const { t } = useLocale();
  const { data } = optionProps;
  return data.slug !== "add-new" ? (
    <InstallAppButton
      type={data.type}
      render={(installProps) => {
        return (
          <Button {...installProps} className="w-full" color="minimal">
            {data.image && (
              <img className="float-left mr-3 inline h-5 w-5" src={data.image} alt={data.label} />
            )}
            <p>{data.label}</p>
          </Button>
        );
      }}
    />
  ) : (
    <Button className="w-full" color="minimal" href="/apps/categories/calendar">
      <Icon.FiPlus className="text-color mr-3 ml-1 h-4 w-4" />
      <p>{t("add_new_calendar")}...</p>
    </Button>
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
          image: item.logo,
          type: item.type,
        }));
        options.push({
          label: "Add new calendars",
          slug: "add-new",
          image: "",
          type: "new_other",
        });
        return (
          <Select
            name="additionalCalendar"
            placeholder={t("install_another")}
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
                  borderRadius: "6px",
                };
              },
            }}
            isSearchable={false}
            className="min-w-52 block w-full flex-1 rounded-none rounded-r-sm border-gray-300 text-sm font-medium text-gray-700"
            isLoading={isLoading}
            components={{ Option: ImageOption }}
          />
        );
      }}
    />
  );
};

export default AdditionalCalendarSelector;
