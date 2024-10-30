import { isEqual } from "lodash";
import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import { Query, Builder, Utils as QbUtils } from "react-awesome-query-builder";
import type { ImmutableTree, BuilderProps, Config } from "react-awesome-query-builder";
import { useFormContext, Controller } from "react-hook-form";
import type { Options } from "react-select";

import {
  getQueryBuilderConfigForAttributes,
  type AttributesQueryBuilderConfigWithRaqbFields,
} from "@calcom/app-store/routing-forms/lib/getQueryBuilderConfig";
import { buildStateFromQueryValue } from "@calcom/app-store/routing-forms/lib/raqbUtils";
import { AttributesQueryValue } from "@calcom/lib/raqb/types";
import type { FormValues, Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { classNames as cn } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import { SettingsToggle } from "@calcom/ui";

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
  const queryBuilderData = buildStateFromQueryValue({
    queryValue,
    config: attributesQueryBuilderConfig,
  });

  const renderBuilder = useCallback(
    (props: BuilderProps) => (
      <div className="query-builder-container">
        <div className="query-builder qb-lite">
          <Builder {...props} />
        </div>
      </div>
    ),
    []
  );

  function onChange(immutableTree: ImmutableTree, config: AttributesQueryBuilderConfigWithRaqbFields) {
    const jsonTree = QbUtils.getTree(immutableTree);
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
          {...attributesQueryBuilderConfig}
          value={queryBuilderData.state.tree}
          onChange={onChange}
          renderBuilder={renderBuilder}
        />
      </div>
      <div className="text-sm">
        <MatchingTeamMembers teamId={teamId} queryValue={queryValue} />
      </div>
    </div>
  );
}

function MatchingTeamMembers({ teamId, queryValue }: { teamId: number; queryValue: AttributesQueryValue }) {
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
  if (!matchingTeamMembers) {
    return (
      <span className="text-subtle text-sm">
        {t("all_assigned_members_of_the_team_event_type_consider_adding_some_attribute_rules")}
      </span>
    );
  }

  return (
    <div className="border-subtle bg-muted mt-4 space-y-3 rounded-md border p-4">
      <div className="text-emphasis flex items-center text-sm font-medium">
        <span>{matchingTeamMembers.length}</span>
        <span className="ml-1">{t("matching_team_members")}</span>
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

type ToggleableSegmentProps = {
  teamId: number;
  enabled: boolean;
  onToggle: (active: boolean) => void;
  queryValue: AttributesQueryValue | null;
  onQueryValueChange: ({ queryValue }: { queryValue: AttributesQueryValue }) => void;
  className?: string;
};

export function ToggleableSegment({
  teamId,
  enabled,
  onToggle,
  queryValue,
  onQueryValueChange,
  className,
}: ToggleableSegmentProps) {
  const { t } = useLocale();

  return (
    <Controller<FormValues>
      name="assignTeamMembersInSegment"
      render={() => (
        <SettingsToggle
          noIndentation
          title={t("filter_by_attributes")}
          labelClassName="mt-0.5 font-normal"
          checked={enabled}
          onCheckedChange={(active) => {
            onToggle(active);
          }}>
          <Segment
            teamId={teamId}
            queryValue={queryValue}
            onQueryValueChange={onQueryValueChange}
            className={className}
          />
        </SettingsToggle>
      )}
    />
  );
}
