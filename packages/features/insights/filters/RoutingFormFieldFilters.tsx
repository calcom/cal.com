import { memo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Icon } from "@calcom/ui";
import { FilterSelect } from "@calcom/ui/filter-select";

import { useFilterContext } from "../context/provider";

export const RoutingFormFieldFilters = memo(() => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, selectedRoutingFormId, isAll, fieldFilters = {} } = filter;
  const { selectedFilter } = filter;

  const { data: fieldOptions } = trpc.viewer.insights.getRoutingFormFieldOptions.useQuery(
    {
      teamId: selectedTeamId,
      isAll,
      routingFormId: selectedRoutingFormId,
    },
    {
      enabled: selectedFilter?.includes("routing_forms"),
    }
  );

  if (!selectedFilter?.includes("routing_forms") || !fieldOptions) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {fieldOptions.map((field) => {
        if (!field.options?.length) return null;

        const filterOptions = field.options.map((opt) => ({
          value: opt.id,
          label: opt.label,
        }));

        return (
          <FilterSelect
            key={field.id}
            title={field.label}
            options={filterOptions}
            isMulti
            selectedValue={fieldFilters[field.id] || []}
            onChange={(value) =>
              setConfigFilters({
                fieldFilters: {
                  ...fieldFilters,
                  [field.id]: value,
                },
              })
            }
            buttonIcon={<Icon name="filter" className="mr-2 h-4 w-4" />}
          />
        );
      })}
    </div>
  );
});

RoutingFormFieldFilters.displayName = "RoutingFormFieldFilters";
