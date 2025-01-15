"use client";

import { useCallback, useState } from "react";
import { Query, Builder, Utils as QbUtils } from "react-awesome-query-builder";
import type { ImmutableTree, BuilderProps } from "react-awesome-query-builder";
import type { JsonTree } from "react-awesome-query-builder";

import {
  withRaqbSettingsAndWidgets,
  ConfigFor,
} from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/config/uiConfig";
import { getQueryBuilderConfigForAttributes } from "@calcom/app-store/routing-forms/lib/getQueryBuilderConfig";
import { classNames as cn } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isEqual } from "@calcom/lib/isEqual";
import { buildStateFromQueryValue } from "@calcom/lib/raqb/raqbUtils";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { trpc, type RouterOutputs } from "@calcom/trpc";

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

function MatchingTeamMembers({
  teamId,
  queryValue,
}: {
  teamId: number;
  queryValue: AttributesQueryValue | null;
}) {
  const { t } = useLocale();
  const { data: matchingTeamMembersWithResult, isPending } =
    trpc.viewer.attributes.findTeamMembersMatchingAttributeLogic.useQuery({
      teamId,
      attributesQueryValue: queryValue,
      _enablePerf: true,
    });

  if (isPending) return <span>{t("loading")}</span>;
  if (!matchingTeamMembersWithResult) return <span>{t("something_went_wrong")}</span>;
  const { result: matchingTeamMembers } = matchingTeamMembersWithResult;
  if (!matchingTeamMembers || !queryValue) {
    return (
      <div className="border-subtle bg-muted mt-4 space-y-3 rounded-md border p-4">
        <div className="text-subtle flex items-center text-sm font-medium">
          <span>{t("no_filter_set")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-subtle bg-muted mt-4 space-y-3 rounded-md border p-4">
      <div className="text-emphasis flex items-center text-sm font-medium">
        <span>{t("x_matching_members", { x: matchingTeamMembers.length })}</span>
      </div>
      <ul className="divide-subtle divide-y">
        {matchingTeamMembers.map((member) => (
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
    console.log("Error fetching attributes");
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
