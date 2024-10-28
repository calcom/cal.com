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
  queryValue,
  onQueryValueChange,
  className,
}: {
  attributes: Attributes;
  teamId: number;
  queryValue: AttributesQueryValue;
  onQueryValueChange: ({ queryValue }: { queryValue: AttributesQueryValue }) => void;
  className?: string;
}) {
  const { t } = useLocale();

  const attributesQueryBuilderConfig = getQueryBuilderConfigForAttributes({
    attributes,
  });

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

    onQueryValueChange({
      queryValue: jsonTree,
    });
  }

  return (
    // cal-query-builder class has special styling through global CSS, allowing us to customize RAQB
    <div className={cn("cal-query-builder", className)}>
      <Query
        {...attributesQueryBuilderConfig}
        value={queryBuilderData.state.tree}
        onChange={onChange}
        renderBuilder={renderBuilder}
      />
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
  queryValue: AttributesQueryValue;
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

type ToggleableSegmentWithAttributesProps = {
  teamId: number;
  enabled: boolean;
  setAssignTeamMembersInSegment: Dispatch<SetStateAction<boolean>>;
  onToggle: (active: boolean) => void;
  queryValue: AttributesQueryValue;
  onQueryValueChange: ({ queryValue }: { queryValue: AttributesQueryValue }) => void;
  className?: string;
};

export function ToggleableSegment({
  teamId,
  enabled,
  setAssignTeamMembersInSegment,
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

export function ToggleableSegmentWithAttributes(
  props: ToggleableSegmentWithAttributesProps & {
    attributes: Attributes;
  }
) {
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
          <SegmentWithAttributes
            teamId={teamId}
            attributes={attributes}
            queryValue={queryValue}
            onQueryValueChange={onQueryValueChange}
            className={className}
          />
        </SettingsToggle>
      )}
    />
  );
}
