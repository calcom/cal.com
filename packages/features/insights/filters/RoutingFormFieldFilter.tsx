import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Icon, FilterSelect } from "@calcom/ui";

import { useFilterContext } from "../context/provider";

export const RoutingFormFieldFilter = ({ fieldId }: { fieldId: string }) => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, isAll, selectedRoutingFormId, selectedRoutingFormFilter } = filter;

  const { data: fieldOptions } = trpc.viewer.insights.getRoutingFormFieldOptions.useQuery(
    {
      teamId: selectedTeamId ?? undefined,
      isAll: !!isAll,
      routingFormId: selectedRoutingFormId ?? undefined,
    },
    {
      enabled: !!selectedTeamId || !!isAll,
    }
  );

  const currentField = useMemo(() => {
    return fieldOptions?.find((option) => `${option.id}` === fieldId);
  }, [fieldOptions]);

  if (!currentField) return null;

  const options =
    currentField.options?.map((option) => ({
      value: option.id ?? "",
      label: option.label,
    })) ?? [];

  return (
    <>
      <FilterSelect
        title={currentField.label}
        options={options}
        selectedValue={selectedRoutingFormFilter?.optionId}
        onChange={(value) => {
          console.log("value", value);
          if (!value) {
            setConfigFilters({
              selectedRoutingFormFilter: null,
            });
          } else {
            setConfigFilters({
              selectedRoutingFormFilter: {
                fieldId,
                optionId: value as string,
              },
            });
          }
        }}
        buttonIcon={<Icon name="layers" className="mr-2 h-4 w-4" />}
        placeholder={t("search")}
      />
    </>
  );
};
