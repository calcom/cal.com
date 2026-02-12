import type { MultiValue, SingleValue } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import { Button } from "@calcom/ui/components/button";
import { Input, Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import {
  formatConditionValue,
  generateConditionId,
  getConditionTypeOptions,
  getDefaultAttributeCondition,
  getDefaultTeamCondition,
  getOperatorOptionsForAttributeType,
  getParentOperatorOptions,
  getTeamOperatorOptions,
  isArrayOperator,
  isTeamCondition,
  type TAttributeSyncRuleConditionWithId,
} from "@calcom/features/ee/integration-attribute-sync/lib/ruleHelpers";
import {
  ConditionIdentifierEnum,
  type ConditionOperatorEnum,
  type IAttributeCondition,
  type IAttributeSyncRule,
  type ITeamCondition,
  type RuleOperatorEnum,
  type TAttributeSyncRuleCondition,
} from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";

const ensureConditionHasId = (condition: TAttributeSyncRuleCondition): TAttributeSyncRuleConditionWithId => {
  if ("_id" in condition && condition._id) {
    return condition as TAttributeSyncRuleConditionWithId;
  }
  return { ...condition, _id: generateConditionId() } as TAttributeSyncRuleConditionWithId;
};

interface RuleBuilderProps {
  value: IAttributeSyncRule;
  onChange: (value: IAttributeSyncRule) => void;
  teamOptions: { value: string; label: string }[];
  attributes: Attribute[];
  isLoadingTeams?: boolean;
  isLoadingAttributes?: boolean;
}

interface ConditionComponentProps {
  condition: TAttributeSyncRuleCondition;
  onChange: (condition: TAttributeSyncRuleCondition) => void;
  onRemove: () => void;
  teamOptions: { value: string; label: string }[];
  attributes: Attribute[];
  isLoading?: boolean;
}

const ConditionComponent = ({
  condition,
  onChange,
  onRemove,
  teamOptions,
  attributes,
  isLoading,
}: ConditionComponentProps) => {
  const { t } = useLocale();
  const conditionTypeOptions = getConditionTypeOptions(t);
  const conditionTypeOption = conditionTypeOptions.find(
    (opt: { value: ConditionIdentifierEnum; label: string }) => opt.value === condition.identifier
  );

  const handleTypeChange = (newType: { value: ConditionIdentifierEnum; label: string } | null) => {
    if (!newType) return;

    if (newType.value === ConditionIdentifierEnum.TEAM_ID) {
      onChange(getDefaultTeamCondition());
    } else {
      onChange(getDefaultAttributeCondition());
    }
  };

  return (
    <div className="bg-default border-subtle flex flex-wrap items-center gap-2 rounded-lg border p-3">
      {/* Condition type selector */}
      <Select
        size="sm"
        className="w-32"
        value={conditionTypeOption}
        onChange={handleTypeChange}
        options={conditionTypeOptions}
        isDisabled={isLoading}
      />

      {/* Render team or attribute specific fields */}
      {isTeamCondition(condition) ? (
        <TeamConditionFields
          condition={condition}
          onChange={onChange}
          teamOptions={teamOptions}
          isLoading={isLoading}
        />
      ) : (
        <AttributeConditionFields
          condition={condition}
          onChange={onChange}
          attributes={attributes}
          isLoading={isLoading}
        />
      )}

      <Button
        color="minimal"
        size="sm"
        StartIcon="trash-2"
        onClick={onRemove}
        disabled={isLoading}
        className="text-subtle hover:text-default"
      />
    </div>
  );
};

interface TeamConditionFieldsProps {
  condition: ITeamCondition;
  onChange: (condition: TAttributeSyncRuleCondition) => void;
  teamOptions: { value: string; label: string }[];
  isLoading?: boolean;
}

const TeamConditionFields = ({ condition, onChange, teamOptions, isLoading }: TeamConditionFieldsProps) => {
  const { t } = useLocale();
  const teamOperatorOptions = getTeamOperatorOptions(t);
  const operatorOption = teamOperatorOptions.find(
    (opt: { value: ConditionOperatorEnum; label: string }) => opt.value === condition.operator
  );
  const isMulti = isArrayOperator(condition.operator);

  const selectedTeams = isMulti
    ? teamOptions.filter((opt) => condition.value.includes(Number(opt.value)))
    : teamOptions.find((opt) => Number(opt.value) === condition.value[0]);

  const handleOperatorChange = (newOperator: { value: ConditionOperatorEnum; label: string } | null) => {
    if (!newOperator) return;

    const formattedValue = formatConditionValue(newOperator.value, condition.value) as number[];
    onChange({
      ...condition,
      operator: newOperator.value,
      value: formattedValue,
    });
  };

  const handleTeamsChange = (
    selected: MultiValue<{ value: string; label: string }> | SingleValue<{ value: string; label: string }>
  ) => {
    if (!selected) {
      onChange({ ...condition, value: [] });
      return;
    }

    if (Array.isArray(selected)) {
      onChange({
        ...condition,
        value: selected.map((s) => Number(s.value)),
      });
    } else {
      const singleValue = selected as { value: string; label: string };
      onChange({
        ...condition,
        value: [Number(singleValue.value)],
      });
    }
  };

  return (
    <>
      <span className="text-default text-sm">{t("team").toLowerCase()}</span>

      <Select
        size="sm"
        className="w-40"
        value={operatorOption}
        onChange={handleOperatorChange}
        options={teamOperatorOptions}
        isDisabled={isLoading}
      />

      <div className="flex-1" style={{ minWidth: "200px" }}>
        <Select
          size="sm"
          isMulti={isMulti}
          value={selectedTeams}
          onChange={handleTeamsChange}
          options={teamOptions}
          isLoading={isLoading}
          isDisabled={isLoading}
          placeholder={t("attribute_sync_select_teams")}
          className="w-full"
        />
      </div>
    </>
  );
};

interface AttributeConditionFieldsProps {
  condition: IAttributeCondition;
  onChange: (condition: TAttributeSyncRuleCondition) => void;
  attributes: Attribute[];
  isLoading?: boolean;
}

const AttributeConditionFields = ({
  condition,
  onChange,
  attributes,
  isLoading,
}: AttributeConditionFieldsProps) => {
  const { t } = useLocale();
  const selectedAttribute = attributes.find((attr) => attr.id === condition.attributeId);

  const attributeOptions = attributes.map((attr) => ({
    value: attr.id,
    label: attr.name,
  }));

  const operatorOptions = selectedAttribute
    ? getOperatorOptionsForAttributeType(selectedAttribute.type, t)
    : [];

  const operatorOption = operatorOptions.find(
    (opt: { value: ConditionOperatorEnum; label: string }) => opt.value === condition.operator
  );

  const handleAttributeChange = (selected: { value: string; label: string } | null) => {
    if (!selected) return;

    const newAttribute = attributes.find((attr) => attr.id === selected.value);
    if (!newAttribute) return;

    // Reset operator and value when attribute changes
    const defaultOperator = getOperatorOptionsForAttributeType(newAttribute.type, t)[0];

    onChange({
      ...condition,
      attributeId: selected.value,
      operator: defaultOperator.value,
      value: [],
    });
  };

  const handleOperatorChange = (newOperator: { value: ConditionOperatorEnum; label: string } | null) => {
    if (!newOperator) return;

    const formattedValue = formatConditionValue(newOperator.value, condition.value) as string[];
    onChange({
      ...condition,
      operator: newOperator.value,
      value: formattedValue,
    });
  };

  const handleValueChange = (
    selected: MultiValue<{ value: string; label: string }> | SingleValue<{ value: string; label: string }>
  ) => {
    if (!selected) {
      onChange({ ...condition, value: [] });
      return;
    }

    if (Array.isArray(selected)) {
      onChange({
        ...condition,
        value: selected.map((s) => s.value),
      });
    } else {
      const singleValue = selected as { value: string; label: string };
      onChange({
        ...condition,
        value: [singleValue.value],
      });
    }
  };

  const handleTextValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...condition,
      value: [e.target.value],
    });
  };

  const handleNumberValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...condition,
      value: [e.target.value],
    });
  };

  // Render value input based on attribute type
  const renderValueInput = () => {
    if (!selectedAttribute) {
      return (
        <div className="text-subtle flex-1 text-sm" style={{ minWidth: "200px" }}>
          {t("attribute_sync_select_attribute_first")}
        </div>
      );
    }

    const isMulti = isArrayOperator(condition.operator);

    switch (selectedAttribute.type) {
      case "SINGLE_SELECT":
      case "MULTI_SELECT": {
        const valueOptions = selectedAttribute.options.map((opt: { id: string; value: string }) => ({
          value: opt.id,
          label: opt.value,
        }));

        const selectedValues = isMulti
          ? valueOptions.filter((opt: { value: string; label: string }) =>
              condition.value.includes(opt.value)
            )
          : valueOptions.find((opt: { value: string; label: string }) => condition.value[0] === opt.value);

        return (
          <div className="flex-1" style={{ minWidth: "200px" }}>
            <Select
              size="sm"
              isMulti={isMulti}
              value={selectedValues}
              onChange={handleValueChange}
              options={valueOptions}
              isLoading={isLoading}
              isDisabled={isLoading}
              placeholder={t("attribute_sync_select_values")}
              className="w-full"
            />
          </div>
        );
      }

      case "TEXT":
        return (
          <div className="flex-1" style={{ minWidth: "200px" }}>
            <Input
              type="text"
              value={condition.value[0] || ""}
              onChange={handleTextValueChange}
              disabled={isLoading}
              placeholder={t("attribute_sync_enter_text_value")}
              className="h-7 text-sm"
            />
          </div>
        );

      case "NUMBER":
        return (
          <div className="flex-1" style={{ minWidth: "200px" }}>
            <Input
              type="number"
              value={condition.value[0] || ""}
              onChange={handleNumberValueChange}
              disabled={isLoading}
              placeholder={t("attribute_sync_enter_number_value")}
              className="h-7 text-sm"
            />
          </div>
        );
    }
  };

  return (
    <>
      <span className="text-default text-sm">{t("attribute").toLowerCase()}</span>

      <Select
        size="sm"
        className="w-48"
        value={attributeOptions.find((opt) => opt.value === condition.attributeId)}
        onChange={handleAttributeChange}
        options={attributeOptions}
        isLoading={isLoading}
        isDisabled={isLoading}
        placeholder={t("attribute_sync_select_attribute")}
      />

      {selectedAttribute && (
        <>
          <Select
            size="sm"
            className="w-40"
            value={operatorOption}
            onChange={handleOperatorChange}
            options={operatorOptions}
            isDisabled={isLoading}
          />

          {renderValueInput()}
        </>
      )}
    </>
  );
};

export const RuleBuilder = ({
  value,
  onChange,
  teamOptions,
  attributes,
  isLoadingTeams,
  isLoadingAttributes,
}: RuleBuilderProps) => {
  const { t } = useLocale();
  const parentOperatorOptions = getParentOperatorOptions(t);
  const parentOperatorOption = parentOperatorOptions.find(
    (opt: { value: RuleOperatorEnum; label: string }) => opt.value === value.operator
  );
  const isLoading = isLoadingTeams || isLoadingAttributes;

  const handleOperatorChange = (newOperator: { value: RuleOperatorEnum; label: string } | null) => {
    if (!newOperator) return;
    onChange({
      ...value,
      operator: newOperator.value,
    });
  };

  const handleAddCondition = () => {
    onChange({
      ...value,
      conditions: [...value.conditions, getDefaultTeamCondition()],
    });
  };

  const handleConditionChange = (index: number, newCondition: TAttributeSyncRuleCondition) => {
    const newConditions = [...value.conditions];
    newConditions[index] = newCondition;
    onChange({
      ...value,
      conditions: newConditions,
    });
  };

  const handleRemoveCondition = (index: number) => {
    onChange({
      ...value,
      conditions: value.conditions.filter((_: TAttributeSyncRuleCondition, i: number) => i !== index),
    });
  };

  return (
    <div className="bg-default border-subtle rounded-2xl border p-2">
      <div className="ml-2 flex items-center gap-0.5">
        <div className="border-subtle rounded-lg border p-1">
          <Icon name="filter" className="text-subtle h-4 w-4" />
        </div>
        <span className="text-emphasis ml-2 text-sm font-medium">
          {t("attribute_sync_user_filter_rules")}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
        <span className="text-default text-sm">{t("attribute_sync_sync_users_where")}</span>
        <Select
          size="sm"
          className="w-28"
          value={parentOperatorOption}
          onChange={handleOperatorChange}
          options={parentOperatorOptions}
          isDisabled={isLoading}
        />
        <span className="text-default text-sm">{t("attribute_sync_conditions_match")}</span>
      </div>

      <div className="bg-muted mt-2 space-y-2 rounded-xl p-2">
        {value.conditions.length === 0 ? (
          <div className="text-subtle py-6 text-center text-sm">{t("attribute_sync_no_conditions")}</div>
        ) : (
          value.conditions.map((condition: TAttributeSyncRuleCondition, index: number) => {
            const conditionWithId = ensureConditionHasId(condition);
            return (
              <ConditionComponent
                key={conditionWithId._id}
                condition={conditionWithId}
                onChange={(newCondition) => handleConditionChange(index, newCondition)}
                onRemove={() => handleRemoveCondition(index)}
                teamOptions={teamOptions}
                attributes={attributes}
                isLoading={isLoading}
              />
            );
          })
        )}
      </div>

      <Button
        color="minimal"
        size="sm"
        StartIcon="plus"
        className="mt-2"
        onClick={handleAddCondition}
        disabled={isLoading}>
        {t("attribute_sync_add_condition")}
      </Button>
    </div>
  );
};
