import { memo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";

type Form = RouterOutputs["viewer"]["appRoutingForms"]["forms"][number];
type Option = { value: string; label: string };

const mapFormToOption = (form: Form): Option => ({
  value: form.id.toString(),
  label: form.teamId ? `${form.title} (${form.team?.name})` : form.title,
});

export const RoutingFormFilterList = memo(() => {
  const { t } = useLocale();
  const { filter, setConfigFilters } = useFilterContext();
  const { selectedTeamId, selectedEventTypeId, selectedUserId, isAll } = filter;
  const { selectedFilter } = filter;

  const { data: allForms } = trpc.viewer.insights.getRoutingFormsForFilters.useQuery({
    teamId: selectedTeamId,
    isAll,
  });

  console.log("allForms", allForms);

  if (!selectedFilter?.includes("routing_forms")) return null;

  return <div>RoutingFormFilterList</div>;

  // return (
  //   <AnimatedPopover text={getPopoverText()}>
  //     <FilterCheckboxFieldsContainer>
  //       {filterOptions?.map((eventType) => (
  //         <div
  //           key={eventType.value}
  //           className="item-center hover:bg-muted flex cursor-pointer px-4 py-2 transition">
  //           <CheckboxField
  //             checked={eventTypeValue?.value === eventType.value}
  //             onChange={(e) => {
  //               if (e.target.checked) {
  //                 const selectedEventTypeId = data.find((item) => item.id.toString() === eventType.value)?.id;
  //                 !!selectedEventTypeId &&
  //                   setConfigFilters({
  //                     selectedEventTypeId,
  //                   });
  //               } else if (!e.target.checked) {
  //                 setConfigFilters({
  //                   selectedEventTypeId: null,
  //                 });
  //               }
  //             }}
  //             description={eventType.label}
  //           />
  //         </div>
  //       ))}
  //       {filterOptions?.length === 0 && (
  //         <h2 className="text-default px-4 py-2 text-sm font-medium">{t("no_options_available")}</h2>
  //       )}
  //     </FilterCheckboxFieldsContainer>
  //   </AnimatedPopover>
  // );
});

RoutingFormFilterList.displayName = "RoutingFormFilterList";
