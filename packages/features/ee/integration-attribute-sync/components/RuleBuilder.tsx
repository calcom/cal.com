import type { MultiValue, SingleValue } from "react-select";

import type { Attribute } from "@calcom/lib/service/attribute/server/getAttributes";
import { Button } from "@calcom/ui/components/button";
import { Input, Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import {
  CONDITION_TYPE_OPTIONS,
  formatConditionValue,
  getDefaultAttributeCondition,
  getDefaultTeamCondition,
  getOperatorOptionsForAttributeType,
  isArrayOperator,
  isTeamCondition,
  PARENT_OPERATOR_OPTIONS,
  TEAM_OPERATOR_OPTIONS,
} from "../lib/ruleHelpers";
import type {
  AttributeCondition,
  Condition,
  ConditionIdentifier,
  ConditionOperator,
  Rule,
  RuleOperator,
  TeamCondition,
} from "../schemas/zod";

interface RuleBuilderProps {
  value: Rule;
  onChange: (value: Rule) => void;
  teamOptions: { value: string; label: string }[];
  attributes: Attribute[];
  isLoadingTeams?: boolean;
  isLoadingAttributes?: boolean;
}

interface ConditionComponentProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
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
  const conditionTypeOption = CONDITION_TYPE_OPTIONS.find((opt) => opt.value === condition.identifier);

  const handleTypeChange = (newType: { value: ConditionIdentifier; label: string } | null) => {
    if (!newType) return;

    if (newType.value === "teamId") {
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
        options={CONDITION_TYPE_OPTIONS}
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
  condition: TeamCondition;
  onChange: (condition: Condition) => void;
  teamOptions: { value: string; label: string }[];
  isLoading?: boolean;
}

const TeamConditionFields = ({ condition, onChange, teamOptions, isLoading }: TeamConditionFieldsProps) => {
  const operatorOption = TEAM_OPERATOR_OPTIONS.find((opt) => opt.value === condition.operator);
  const isMulti = isArrayOperator(condition.operator);

  const selectedTeams = isMulti
    ? teamOptions.filter((opt) => condition.value.includes(Number(opt.value)))
    : teamOptions.find((opt) => Number(opt.value) === condition.value[0]);

  const handleOperatorChange = (newOperator: { value: ConditionOperator; label: string } | null) => {
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
      <span className="text-default text-sm">team</span>

      <Select
        size="sm"
        className="w-40"
        value={operatorOption}
        onChange={handleOperatorChange}
        options={TEAM_OPERATOR_OPTIONS}
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
          placeholder="Select team(s)..."
          className="w-full"
        />
      </div>
    </>
  );
};

interface AttributeConditionFieldsProps {
  condition: AttributeCondition;
  onChange: (condition: Condition) => void;
  attributes: Attribute[];
  isLoading?: boolean;
}

const AttributeConditionFields = ({
  condition,
  onChange,
  attributes,
  isLoading,
}: AttributeConditionFieldsProps) => {
  const selectedAttribute = attributes.find((attr) => attr.id === condition.attributeId);

  const attributeOptions = attributes.map((attr) => ({
    value: attr.id,
    label: attr.name,
  }));

  const operatorOptions = selectedAttribute ? getOperatorOptionsForAttributeType(selectedAttribute.type) : [];

  const operatorOption = operatorOptions.find((opt) => opt.value === condition.operator);

  const handleAttributeChange = (selected: { value: string; label: string } | null) => {
    if (!selected) return;

    const newAttribute = attributes.find((attr) => attr.id === selected.value);
    if (!newAttribute) return;

    // Reset operator and value when attribute changes
    const defaultOperator = getOperatorOptionsForAttributeType(newAttribute.type)[0];

    onChange({
      ...condition,
      attributeId: selected.value,
      operator: defaultOperator.value,
      value: [],
    });
  };

  const handleOperatorChange = (newOperator: { value: ConditionOperator; label: string } | null) => {
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
          Select an attribute first
        </div>
      );
    }

    const isMulti = isArrayOperator(condition.operator);

    switch (selectedAttribute.type) {
      case "SINGLE_SELECT":
      case "MULTI_SELECT": {
        const valueOptions = selectedAttribute.options.map((opt) => ({
          value: opt.id,
          label: opt.value,
        }));

        const selectedValues = isMulti
          ? valueOptions.filter((opt) => condition.value.includes(opt.value))
          : valueOptions.find((opt) => condition.value[0] === opt.value);

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
              placeholder="Select value(s)..."
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
              placeholder="Enter text value..."
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
              placeholder="Enter number value..."
              className="h-7 text-sm"
            />
          </div>
        );
    }
  };

  return (
    <>
      <span className="text-default text-sm">attribute</span>

      <Select
        size="sm"
        className="w-48"
        value={attributeOptions.find((opt) => opt.value === condition.attributeId)}
        onChange={handleAttributeChange}
        options={attributeOptions}
        isLoading={isLoading}
        isDisabled={isLoading}
        placeholder="Select attribute..."
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
  const parentOperatorOption = PARENT_OPERATOR_OPTIONS.find((opt) => opt.value === value.operator);
  const isLoading = isLoadingTeams || isLoadingAttributes;

  const handleOperatorChange = (newOperator: { value: RuleOperator; label: string } | null) => {
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

  const handleConditionChange = (index: number, newCondition: Condition) => {
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
      conditions: value.conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-default border-subtle rounded-2xl border p-2">
      <div className="ml-2 flex items-center gap-0.5">
        <div className="border-subtle rounded-lg border p-1">
          <Icon name="filter" className="text-subtle h-4 w-4" />
        </div>
        <span className="text-emphasis ml-2 text-sm font-medium">User Filter Rules</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
        <span className="text-default text-sm">Sync users where</span>
        <Select
          size="sm"
          className="w-28"
          value={parentOperatorOption}
          onChange={handleOperatorChange}
          options={PARENT_OPERATOR_OPTIONS}
          isDisabled={isLoading}
        />
        <span className="text-default text-sm">conditions match:</span>
      </div>

      <div className="bg-muted mt-2 space-y-2 rounded-xl p-2">
        {value.conditions.length === 0 ? (
          <div className="text-subtle py-6 text-center text-sm">
            No conditions added. Click below to add your first condition.
          </div>
        ) : (
          value.conditions.map((condition, index) => (
            <ConditionComponent
              key={index}
              condition={condition}
              onChange={(newCondition) => handleConditionChange(index, newCondition)}
              onRemove={() => handleRemoveCondition(index)}
              teamOptions={teamOptions}
              attributes={attributes}
              isLoading={isLoading}
            />
          ))
        )}
      </div>

      <Button
        color="minimal"
        size="sm"
        StartIcon="plus"
        className="mt-2"
        onClick={handleAddCondition}
        disabled={isLoading}>
        Add condition
      </Button>
    </div>
  );
};
