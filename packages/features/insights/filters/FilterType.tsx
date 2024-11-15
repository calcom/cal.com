import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { IconName } from "@calcom/ui";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  Tooltip,
} from "@calcom/ui";

import { useFilterContext } from "../context/provider";

type FilterType = "event-type" | "user" | "routing_forms" | `rf_${string}` | "booking_status";

type Option = {
  value: FilterType;
  label: string;
  StartIcon: IconName;
};

export const FilterType = ({ showRoutingFilters = false }: { showRoutingFilters?: boolean }) => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedFilter, selectedUserId, selectedTeamId, selectedRoutingFormId, isAll, initialConfig } =
    filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);

  // Dynamically load filters if showRoutingFilters is set to true
  // Query routing form field options when showRoutingFilters is true
  const { data: routingFormFieldOptions } = trpc.viewer.insights.getRoutingFormFieldOptions.useQuery(
    {
      teamId: selectedTeamId ?? -1,
      isAll: !!isAll,
      routingFormId: selectedRoutingFormId ?? undefined,
    },
    {
      enabled: showRoutingFilters && initialConfigIsReady,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    }
  );

  const filterOptions = useMemo(() => {
    let options: Option[] = [
      {
        label: t("user"),
        value: "user",
        StartIcon: "users" as IconName,
      },
    ];

    // Add routing forms filter options
    if (showRoutingFilters) {
      options.push({
        label: t("routing_forms"),
        value: "routing_forms" as FilterType,
        StartIcon: "calendar-check-2" as IconName,
      });

      options.push({
        label: t("booking_status"),
        value: "booking_status" as FilterType,
        StartIcon: "circle" as IconName,
      });

      // Add dynamic routing form field options
      if (routingFormFieldOptions?.length) {
        options = [
          ...options,
          ...routingFormFieldOptions.map((option) => ({
            label: option.label,
            value: `rf_${option.id}` as FilterType,
            StartIcon: "layers" as IconName,
          })),
        ];
      }
    } else {
      options.push({
        label: t("event_type"),
        value: "event-type",
        StartIcon: "link",
      });
    }

    if (selectedUserId) {
      // remove user option from filterOptions
      options = options.filter((option) => option.value !== "user");
    }

    return options;
  }, [t, showRoutingFilters, routingFormFieldOptions, selectedUserId]);

  const filterValue = selectedFilter
    ? filterOptions.find((option) => option.value === selectedFilter[0])
    : null;

  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <div className="hover:border-emphasis border-default text-default hover:text-emphasis focus:border-subtle mb-4 flex h-9 max-h-72 items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1">
          <Icon name="plus" className="mr-2 h-4 w-4" />
          <Tooltip content={t("add_filter")}>
            <div>{t("add_filter")}</div>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="z-50 w-44">
        {filterOptions?.map((option) => (
          <DropdownMenuItem key={option.label} className="w-44">
            <DropdownItem
              type="button"
              StartIcon={option.StartIcon}
              onClick={() => {
                // This can multiple values, but for now we only want to have one filter active at a time
                setConfigFilters({
                  selectedFilter: [option.value],
                });
              }}
              childrenClassName="w-full">
              <div className="flex w-full items-center justify-between">
                {t(option.label)}
                {filterValue?.value === option.value && <Icon name="check" className="h-4 w-4" />}
              </div>
            </DropdownItem>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};
