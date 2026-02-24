"use client";

import { buildStateFromQueryValue } from "@calcom/app-store/_utils/raqb/raqbUtils.client";
import {
  ConfigFor,
  withRaqbSettingsAndWidgets,
} from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/config/uiConfig";
import { getQueryBuilderConfigForAttributes } from "@calcom/app-store/routing-forms/lib/getQueryBuilderConfig";
import { useFetchMoreOnScroll } from "@calcom/features/eventtypes/lib/useFetchMoreOnScroll";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isEqual } from "@calcom/lib/isEqual";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { type RouterOutputs, trpc } from "@calcom/trpc/react";
import { AssignedSearchInput } from "@calcom/features/eventtypes/components/AssignedSearchInput";
import cn from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";
import { keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useCallback, useMemo, useRef, useState } from "react";
import type { BuilderProps, ImmutableTree, JsonTree } from "react-awesome-query-builder";
import { Builder, Utils as QbUtils, Query } from "react-awesome-query-builder";

export type Attributes = RouterOutputs["viewer"]["appRoutingForms"]["getAttributesForTeam"];
export function useAttributes(teamId: number) {
  const { data: attributes, isPending } = trpc.viewer.appRoutingForms.getAttributesForTeam.useQuery({
    teamId,
  });
  return {
    attributes,
    isPending,
  };
}

function SegmentWithAttributes({
  attributes,
  teamId,
  queryValue: initialQueryValue,
  onQueryValueChange,
  className,
}: {
  attributes: Attributes;
  teamId: number;
  queryValue: AttributesQueryValue | null;
  onQueryValueChange: ({ queryValue }: { queryValue: AttributesQueryValue }) => void;
  className?: string;
}) {
  const attributesQueryBuilderConfig = getQueryBuilderConfigForAttributes({
    attributes,
  });

  const [queryValue, setQueryValue] = useState(initialQueryValue);
  const attributesQueryBuilderConfigWithRaqbSettingsAndWidgets = withRaqbSettingsAndWidgets({
    config: attributesQueryBuilderConfig,
    configFor: ConfigFor.Attributes,
  });

  const queryBuilderData = buildStateFromQueryValue({
    queryValue: queryValue as JsonTree,
    config: attributesQueryBuilderConfigWithRaqbSettingsAndWidgets,
  });

  const renderBuilder = useCallback(
    (props: BuilderProps) => (
      <div className="query-builder-container" data-testid="query-builder-container">
        <div className="query-builder qb-lite">
          <Builder {...props} />
        </div>
      </div>
    ),
    []
  );

  function onChange(immutableTree: ImmutableTree) {
    const jsonTree = QbUtils.getTree(immutableTree) as AttributesQueryValue;

    // IMPORTANT: RAQB calls onChange even without explicit user action. It just identifies if the props have changed or not. isEqual ensures that we don't end up having infinite re-renders.
    if (!isEqual(jsonTree, queryValue)) {
      setQueryValue(jsonTree);
      onQueryValueChange({
        queryValue: jsonTree,
      });
    }
  }

  return (
    // cal-query-builder class has special styling through global CSS, allowing us to customize RAQB
    <div>
      <div className={cn("cal-query-builder", className)}>
        <Query
          {...attributesQueryBuilderConfigWithRaqbSettingsAndWidgets}
          value={queryBuilderData.state.tree}
          onChange={onChange}
          renderBuilder={renderBuilder}
        />
      </div>
      <div className="mt-4 text-sm">
        <MatchingTeamMembers teamId={teamId} queryValue={queryValue} />
      </div>
    </div>
  );
}

const MATCHING_MEMBERS_PAGE_SIZE = 20;

function MatchingTeamMembers({
  teamId,
  queryValue,
}: {
  teamId: number;
  queryValue: AttributesQueryValue | null;
}) {
  const { t } = useLocale();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Check if queryValue has valid children properties value
  const hasValidValue = queryValue?.children1
    ? Object.values(queryValue.children1).some(
        (child) => child.properties?.value?.[0] !== undefined && child.properties?.value?.[0] !== null
      )
    : false;

  const { data, isPending, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage, isError } =
    trpc.viewer.attributes.findTeamMembersMatchingAttributeLogic.useInfiniteQuery(
      {
        teamId,
        attributesQueryValue: queryValue,
        _enablePerf: true,
        limit: MATCHING_MEMBERS_PAGE_SIZE,
        search: debouncedSearch || undefined,
      },
      {
        enabled: hasValidValue,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        placeholderData: keepPreviousData,
      }
    );

  useFetchMoreOnScroll(scrollContainerRef, hasNextPage ?? false, isFetchingNextPage, fetchNextPage);

  const allMatchingTeamMembers = useMemo(
    () => data?.pages.flatMap((page) => page.result ?? []) ?? [],
    [data]
  );

  const total = data?.pages[0]?.total ?? 0;

  if (!hasValidValue) {
    return (
      <div className="border-subtle bg-cal-muted mt-4 stack-y-3 rounded-md border p-4">
        <div className="text-subtle flex items-center text-sm font-medium">
          <span>{t("no_filter_set")}</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-subtle bg-cal-muted mt-4 stack-y-3 rounded-md border p-4">
        <div className="text-error flex items-center text-sm font-medium">
          <span>{t("something_went_wrong")}</span>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div
        className="border-subtle bg-cal-muted mt-4 stack-y-3 rounded-md border p-4"
        data-testid="segment_loading_state">
        <div className="text-emphasis flex items-center text-sm font-medium">
          <div className="bg-subtle h-4 w-32 animate-pulse rounded" />
        </div>
        <ul className="divide-subtle divide-y">
          {[...Array(3)].map((_, index) => (
            <li key={index} className="flex items-center py-2">
              <div className="flex flex-1 items-center space-x-2 text-sm">
                <div className="bg-subtle h-4 w-24 animate-pulse rounded" />
                <div className="bg-subtle h-4 w-32 animate-pulse rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="border-subtle bg-cal-muted mt-4 stack-y-3 rounded-md border p-4">
      <div className="text-emphasis flex items-center text-sm font-medium">
        <span>{t("x_matching_members", { x: total })}</span>
      </div>
      <AssignedSearchInput
        value={search}
        onChange={setSearch}
        isSearching={isFetching && !!debouncedSearch}
      />
      <div ref={scrollContainerRef} className="max-h-[400px] overflow-y-auto">
        <ul className="divide-subtle divide-y">
          {allMatchingTeamMembers.map((member) => (
            <li key={member.id} className="flex items-center py-2">
              <div className="flex flex-1 items-center space-x-2 text-sm">
                <span className="font-medium">{member.name}</span>
                <span className="text-subtle">({member.email})</span>
              </div>
            </li>
          ))}
        </ul>
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Icon name="loader" className="text-subtle h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Segment({
  teamId,
  queryValue,
  onQueryValueChange,
  className,
}: {
  teamId: number;
  queryValue: AttributesQueryValue | null;
  onQueryValueChange: ({ queryValue }: { queryValue: AttributesQueryValue }) => void;
  className?: string;
}) {
  const { attributes, isPending } = useAttributes(teamId);
  const { t } = useLocale();
  if (isPending) return <span>Loading...</span>;
  if (!attributes) {
    console.error("Error fetching attributes");
    return <span>{t("something_went_wrong")}</span>;
  }

  return (
    <SegmentWithAttributes
      teamId={teamId}
      attributes={attributes}
      queryValue={queryValue}
      onQueryValueChange={onQueryValueChange}
      className={className}
    />
  );
}
