"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Options } from "react-select";

import type { Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Input } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import type { CheckedSelectOption } from "./CheckedTeamSelect";
import CheckedTeamSelect from "./CheckedTeamSelect";
import { useEventTypeHosts } from "../hooks/useEventTypeHosts";

type PaginatedHostsSelectProps = {
  eventTypeId: number;
  value: Host[];
  onChange: (hosts: Host[]) => void;
  isFixed: boolean;
  isRRWeightsEnabled?: boolean;
  groupId: string | null;
  placeholder?: string;
  initialTeamMembers?: TeamMember[];
};

const sortByLabel = (a: CheckedSelectOption, b: CheckedSelectOption) => {
  if (a.label < b.label) return -1;
  if (a.label > b.label) return 1;
  return 0;
};

export function PaginatedHostsSelect({
  eventTypeId,
  value,
  onChange,
  isFixed,
  isRRWeightsEnabled,
  groupId,
  placeholder,
  initialTeamMembers = [],
}: PaginatedHostsSelectProps) {
  const { t } = useLocale();
  const [searchInput, setSearchInput] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    hosts,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    handleSearch,
  } = useEventTypeHosts(eventTypeId);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, handleSearch]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, loadMore]);

  const options: Options<CheckedSelectOption> = hosts.map((host) => ({
    value: host.value,
    label: host.label,
    avatar: host.avatar,
    defaultScheduleId: host.defaultScheduleId,
    groupId: groupId,
    priority: 2,
    weight: 100,
    isFixed: isFixed,
  })).sort(sortByLabel);

  const handleChange = useCallback(
    (selectedOptions: readonly CheckedSelectOption[]) => {
      onChange(
        selectedOptions.map((option) => ({
          isFixed,
          userId: parseInt(option.value, 10),
          priority: option.priority ?? 2,
          weight: option.weight ?? 100,
          scheduleId: option.defaultScheduleId,
          groupId: option.groupId,
        }))
      );
    },
    [isFixed, onChange]
  );

  const selectedValues: CheckedSelectOption[] = (value || [])
    .filter(({ isFixed: _isFixed }) => isFixed === _isFixed)
    .reduce((acc, host) => {
      const option = options.find((member) => member.value === host.userId.toString());
      if (!option) {
        const initialMember = initialTeamMembers.find((m) => m.value === host.userId.toString());
        if (initialMember) {
          acc.push({
            value: initialMember.value,
            label: initialMember.label,
            avatar: initialMember.avatar,
            defaultScheduleId: initialMember.defaultScheduleId,
            priority: host.priority ?? 2,
            isFixed,
            weight: host.weight ?? 100,
            groupId: host.groupId,
          });
        }
        return acc;
      }

      acc.push({
        ...option,
        priority: host.priority ?? 2,
        isFixed,
        weight: host.weight ?? 100,
        groupId: host.groupId,
      });

      return acc;
    }, [] as CheckedSelectOption[]);

  return (
    <div className="flex flex-col rounded-md">
      <div className="relative mb-2">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon name="search" className="text-subtle h-4 w-4" />
        </div>
        <Input
          type="text"
          placeholder={t("search_hosts")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
        {isLoading && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Icon name="loader" className="text-subtle h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      <div>
        <CheckedTeamSelect
          isOptionDisabled={(option) => !!value.find((host) => host.userId.toString() === option.value)}
          onChange={handleChange}
          value={selectedValues}
          controlShouldRenderValue={false}
          options={options}
          placeholder={placeholder ?? t("add_attendees")}
          isRRWeightsEnabled={isRRWeightsEnabled}
          groupId={groupId}
        />
      </div>
      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-2">
          {isFetchingNextPage && (
            <Icon name="loader" className="text-subtle h-4 w-4 animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}

export default PaginatedHostsSelect;
