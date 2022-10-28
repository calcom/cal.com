import React from "react";
import { OptionProps } from "react-select";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import { Button } from "@calcom/ui";
import { Icon } from "@calcom/ui/Icon";
import { Select } from "@calcom/ui/v2";

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
          <Button {...installProps} className="flex w-full align-top" color="minimal">
            {data.image && (
              <img className="float-left mr-3 inline h-5 w-5" src={data.image} alt={data.label} />
            )}
            <p className="text-left">{`${t("add")} ${data.label}`}</p>
          </Button>
        );
      }}
    />
  ) : (
    <Button className="w-full" color="minimal" href="/apps/categories/calendar">
      <Icon.FiPlus className="text-color mr-3 ml-1 h-4 w-4" />
      <p>{t("install_new_calendar_app")}</p>
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
            placeholder={
              <div className="flex justify-start text-black">
                <Icon.FiPlus className="-ml-1 h-4 w-4 ltr:mr-2 rtl:ml-2 rtl:-mr-1" />
                <p>{t("add")}</p>
              </div>
            }
            className="min-w-44"
            options={options}
            isSearchable={false}
            isLoading={isLoading}
            components={{ Option: ImageOption }}
            styles={{
              menu: (defaultStyles) => ({
                ...defaultStyles,
                "@media only screen and (max-width: 640px)": {
                  left: "0",
                },
                width: "max-content",
                right: "0",
              }),
              control: (defaultStyles) => ({
                ...defaultStyles,
                padding: "0",
                border: "0",
                borderRadius: "inherit",
              }),
              dropdownIndicator: (defaultStyles) => ({
                ...defaultStyles,
                display: "none",
              }),
              valueContainer: (defaultStyles) => ({
                ...defaultStyles,
                padding: "0",
              }),
              placeholder: (defaultStyles) => ({
                ...defaultStyles,
                margin: "0",
              }),
            }}
          />
        );
      }}
    />
  );
};

export default AdditionalCalendarSelector;
