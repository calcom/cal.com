"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useRef, useState } from "react";
import type { Options, Props } from "react-select";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useFetchMoreOnScroll } from "@calcom/features/eventtypes/lib/useFetchMoreOnScroll";
import type { Host, SelectClassNames } from "@calcom/features/eventtypes/lib/types";
import { getHostsFromOtherGroups } from "@calcom/lib/bookings/hostGroupUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type {
  PriorityDialogCustomClassNames,
  WeightDialogCustomClassNames,
} from "@calcom/features/eventtypes/components/dialogs/HostEditDialogs";
import { PriorityDialog, WeightDialog } from "@calcom/features/eventtypes/components/dialogs/HostEditDialogs";

export type CheckedSelectOption = {
  avatar: string;
  label: string;
  value: string;
  priority?: number;
  weight?: number;
  isFixed?: boolean;
  disabled?: boolean;
  defaultScheduleId?: number | null;
  groupId: string | null;
};

export type CheckedTeamSelectCustomClassNames = {
  hostsSelect?: SelectClassNames;
  selectedHostList?: {
    container?: string;
    listItem?: {
      container?: string;
      avatar?: string;
      name?: string;
      changePriorityButton?: string;
      changeWeightButton?: string;
      removeButton?: string;
    };
  };
  priorityDialog?: PriorityDialogCustomClassNames;
  weightDialog?: WeightDialogCustomClassNames;
};
export const CheckedTeamSelect = ({
  options = [],
  value = [],
  isRRWeightsEnabled,
  customClassNames,
  groupId,
  hosts = [],
  onSearchChange,
  onMenuScrollToBottom,
  isLoadingMore,
  hasNextPageSelected,
  isFetchingNextPageSelected,
  fetchNextPageSelected,
  ...props
}: Omit<Props<CheckedSelectOption, true>, "value" | "onChange"> & {
  options?: Options<CheckedSelectOption>;
  value?: readonly CheckedSelectOption[];
  onChange: (value: readonly CheckedSelectOption[]) => void;
  isRRWeightsEnabled?: boolean;
  customClassNames?: CheckedTeamSelectCustomClassNames;
  groupId: string | null;
  hosts?: Host[];
  onSearchChange?: (search: string) => void;
  onMenuScrollToBottom?: () => void;
  isLoadingMore?: boolean;
  hasNextPageSelected?: boolean;
  isFetchingNextPageSelected?: boolean;
  fetchNextPageSelected?: () => void;
}) => {
  const isPlatform = useIsPlatform();
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);

  const [currentOption, setCurrentOption] = useState(value[0] ?? null);

  const { t } = useLocale();

  const valueFromGroup = groupId ? value.filter((host) => host.groupId === groupId) : value;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stableFetchNextPage = useCallback(() => {
    fetchNextPageSelected?.();
  }, [fetchNextPageSelected]);
  useFetchMoreOnScroll(
    scrollContainerRef,
    hasNextPageSelected ?? false,
    isFetchingNextPageSelected ?? false,
    stableFetchNextPage
  );
  const rowVirtualizer = useVirtualizer({
    count: valueFromGroup.length,
    estimateSize: () => 44,
    getScrollElement: () => scrollContainerRef.current,
    overscan: 5,
  });

  const handleSelectChange = (newValue: readonly CheckedSelectOption[]) => {
    const otherGroupsHosts = getHostsFromOtherGroups(value, groupId);

    const newValueAllGroups = [...otherGroupsHosts, ...newValue.map((host) => ({ ...host, groupId }))];
    props.onChange(newValueAllGroups);
  };

  return (
    <>
      <Select
        {...props}
        name={props.name}
        placeholder={props.placeholder || t("select")}
        isSearchable={true}
        options={options}
        value={valueFromGroup}
        onChange={handleSelectChange}
        isMulti
        className={customClassNames?.hostsSelect?.select}
        innerClassNames={{
          ...customClassNames?.hostsSelect?.innerClassNames,
          control: "rounded-md",
        }}
        {...(onSearchChange
          ? {
              filterOption: null,
              onInputChange: (value: string, actionMeta: { action: string }) => {
                if (actionMeta.action === "input-change") onSearchChange(value);
              },
            }
          : {})}
        onMenuScrollToBottom={onMenuScrollToBottom}
        isLoading={isLoadingMore}
      />
      {valueFromGroup.length >= 1 && (
        <div
          ref={scrollContainerRef}
          className={classNames(
            "mb-4 mt-3 overflow-y-auto rounded-md",
            "border-subtle border",
            customClassNames?.selectedHostList?.container
          )}
          style={{ maxHeight: Math.min(valueFromGroup.length * 44, 400) }}>
          <ul className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const option = valueFromGroup[virtualItem.index];
              const index = virtualItem.index;
              return (
                <li
                  key={option.value}
                  data-index={virtualItem.index}
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  className={classNames(
                    `absolute left-0 flex w-full px-3 py-2 ${index === valueFromGroup.length - 1 ? "" : "border-subtle border-b"}`,
                    customClassNames?.selectedHostList?.listItem?.container
                  )}
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}>
                  {!isPlatform && <Avatar size="sm" imageSrc={option.avatar} alt={option.label} />}
                  {isPlatform && (
                    <Icon
                      name="user"
                      className={classNames(
                        "mt-0.5 h-4 w-4",
                        customClassNames?.selectedHostList?.listItem?.avatar
                      )}
                    />
                  )}
                  <p
                    className={classNames(
                      "text-emphasis my-auto ms-3 text-sm",
                      customClassNames?.selectedHostList?.listItem?.name
                    )}>
                    {option.label}
                  </p>
                  <div className="ml-auto flex items-center">
                    {option && !option.isFixed ? (
                      <>
                        <Tooltip content={t("change_priority")}>
                          <Button
                            color="minimal"
                            onClick={() => {
                              setPriorityDialogOpen(true);
                              setCurrentOption(option);
                            }}
                            className={classNames(
                              "mr-6 h-2 p-0 text-sm hover:bg-transparent",
                              getPriorityTextAndColor(option.priority).color,
                              customClassNames?.selectedHostList?.listItem?.changePriorityButton
                            )}>
                            {t(getPriorityTextAndColor(option.priority).text)}
                          </Button>
                        </Tooltip>
                        {isRRWeightsEnabled ? (
                          <Button
                            color="minimal"
                            className={classNames(
                              "mr-6 h-2 w-4 p-0 text-sm hover:bg-transparent",
                              customClassNames?.selectedHostList?.listItem?.changeWeightButton
                            )}
                            onClick={() => {
                              setWeightDialogOpen(true);
                              setCurrentOption(option);
                            }}>
                            {option.weight ?? 100}%
                          </Button>
                        ) : (
                          <></>
                        )}
                      </>
                    ) : (
                      <></>
                    )}

                    <Icon
                      name="x"
                      onClick={() => props.onChange(value.filter((item) => item.value !== option.value))}
                      className={classNames(
                        "my-auto ml-2 h-4 w-4",
                        customClassNames?.selectedHostList?.listItem?.removeButton
                      )}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {isFetchingNextPageSelected && (
            <div className="flex justify-center py-2">
              <Icon name="loader" className="text-subtle h-4 w-4 animate-spin" />
            </div>
          )}
        </div>
      )}
      {currentOption && !currentOption.isFixed ? (
        <>
          <PriorityDialog
            isOpenDialog={priorityDialogOpen}
            setIsOpenDialog={setPriorityDialogOpen}
            option={currentOption}
            options={options}
            onChange={props.onChange}
            hosts={hosts}
            customClassNames={customClassNames?.priorityDialog}
          />
          <WeightDialog
            isOpenDialog={weightDialogOpen}
            setIsOpenDialog={setWeightDialogOpen}
            option={currentOption}
            options={options}
            onChange={props.onChange}
            hosts={hosts}
            customClassNames={customClassNames?.weightDialog}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};

const getPriorityTextAndColor = (priority?: number) => {
  switch (priority) {
    case 0:
      return { text: "lowest", color: "text-gray-300" };
    case 1:
      return { text: "low", color: "text-gray-400" };
    case 2:
      return { text: "medium", color: "text-gray-500" };
    case 3:
      return { text: "high", color: "text-gray-600" };
    case 4:
      return { text: "highest", color: "text-gray-700" };
    default:
      return { text: "medium", color: "text-gray-500" };
  }
};

export default CheckedTeamSelect;
