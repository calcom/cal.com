"use client";

import { buildStateFromQueryValue } from "@calcom/app-store/_utils/raqb/raqbUtils.client";
import {
  ConfigFor,
  withRaqbSettingsAndWidgets,
} from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/config/uiConfig";
import { getQueryBuilderConfigForAttributes } from "@calcom/app-store/routing-forms/lib/getQueryBuilderConfig";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isEqual } from "@calcom/lib/isEqual";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { type RouterOutputs, trpc } from "@calcom/trpc/react";
import cn from "@calcom/ui/classNames";
import { useCallback, useState } from "react";
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
  filterMemberIds,
}: {
  attributes: Attributes;
  teamId: number;
  queryValue: AttributesQueryValue | null;
  onQueryValueChange: ({ queryValue }: { queryValue: AttributesQueryValue }) => void;
  className?: string;
  filterMemberIds?: number[];
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
        <MatchingTeamMembers teamId={teamId} queryValue={queryValue} filterMemberIds={filterMemberIds} />
      </div>
    </div>
  );
}

function MatchingTeamMembers({
  teamId,
  queryValue,
  filterMemberIds,
}: {
  teamId: number;
  queryValue: AttributesQueryValue | null;
  filterMemberIds?: number[];
}) {
  const { t } = useLocale();

  // Check if queryValue has valid children properties value
  const hasValidValue = queryValue?.children1
    ? Object.values(queryValue.children1).some(
        (child) => child.properties?.value?.[0] !== undefined && child.properties?.value?.[0] !== null
      )
    : false;

  const { data: matchingTeamMembersWithResult, isPending } =
    trpc.viewer.attributes.findTeamMembersMatchingAttributeLogic.useQuery(
      {
        teamId,
        attributesQueryValue: queryValue,
        _enablePerf: true,
      },
      {
        enabled: hasValidValue,
      }
    );

  if (!hasValidValue) {
    return (
      <div className="border-subtle bg-cal-muted mt-4 stack-y-3 rounded-md border p-4">
        <div className="text-subtle flex items-center text-sm font-medium">
          <span>{t("no_filter_set")}</span>
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

  if (!matchingTeamMembersWithResult) return <span>{t("something_went_wrong")}</span>;
  const { result: allMatchingTeamMembers } = matchingTeamMembersWithResult;

  const matchingTeamMembers = filterMemberIds
    ? allMatchingTeamMembers?.filter((member) => filterMemberIds.includes(member.id))
    : allMatchingTeamMembers;

  return (
    <div className="border-subtle bg-cal-muted mt-4 stack-y-3 rounded-md border p-4">
      <div className="text-emphasis flex items-center text-sm font-medium">
        <span>{t("x_matching_members", { x: matchingTeamMembers?.length ?? 0 })}</span>
      </div>
      <ul className="divide-subtle divide-y">
        {matchingTeamMembers?.map((member) => (
          <li key={member.id} className="flex items-center py-2">
            <div className="flex flex-1 items-center space-x-2 text-sm">
              <span className="font-medium">{member.name}</span>
              <span className="text-subtle">({member.email})</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Segment({
  teamId,
  queryValue,
  onQueryValueChange,
  className,
  filterMemberIds,
}: {
  teamId: number;
  queryValue: AttributesQueryValue | null;
  onQueryValueChange: ({ queryValue }: { queryValue: AttributesQueryValue }) => void;
  className?: string;
  filterMemberIds?: number[];
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
      filterMemberIds={filterMemberIds}
    />
  );
}
