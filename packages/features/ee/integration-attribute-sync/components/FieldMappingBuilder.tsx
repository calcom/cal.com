import type { Attribute } from "@calcom/lib/service/attribute/server/getAttributes";
import { Button } from "@calcom/ui/components/button";
import { Input, Select, Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { getDefaultFieldMapping } from "../lib/fieldMappingHelpers";
import type { FieldMapping, FieldMappingFormState } from "../types/fieldMapping";

interface FieldMappingBuilderProps {
  value: FieldMappingFormState;
  onChange: (value: FieldMappingFormState) => void;
  attributes: Attribute[];
  isLoadingAttributes?: boolean;
}

interface MappingRowProps {
  mapping: FieldMapping;
  onChange: (mapping: FieldMapping) => void;
  onRemove: () => void;
  attributes: Attribute[];
  isLoading?: boolean;
}

const MappingRow = ({ mapping, onChange, onRemove, attributes, isLoading }: MappingRowProps) => {
  const attributeOptions = attributes.map((attr) => ({
    value: attr.id,
    label: attr.name,
  }));

  const selectedAttribute = attributeOptions.find((opt) => opt.value === mapping.attributeId);

  const handleFieldNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...mapping,
      integrationFieldName: e.target.value,
    });
  };

  const handleAttributeChange = (selected: { value: string; label: string } | null) => {
    if (!selected) return;
    onChange({
      ...mapping,
      attributeId: selected.value,
    });
  };

  const handleEnabledChange = (checked: boolean) => {
    onChange({
      ...mapping,
      enabled: checked,
    });
  };

  return (
    <div className="bg-default border-subtle flex flex-wrap items-center gap-3 rounded-lg border p-3">
      {/* Integration field name input */}
      <div className="flex-1" style={{ minWidth: "200px" }}>
        <Input
          type="text"
          value={mapping.integrationFieldName}
          onChange={handleFieldNameChange}
          disabled={isLoading}
          placeholder="e.g., Department, Title..."
          className="h-7 text-sm"
        />
      </div>

      {/* Arrow/connector */}
      <Icon name="arrow-right" className="text-subtle h-4 w-4" />

      {/* Cal.com attribute selector */}
      <div className="flex-1" style={{ minWidth: "200px" }}>
        <Select
          size="sm"
          placeholder="Select Cal.com attribute..."
          options={attributeOptions}
          value={selectedAttribute}
          onChange={handleAttributeChange}
          isLoading={isLoading}
          isDisabled={isLoading}
          className="w-full"
        />
      </div>

      {/* Enable toggle */}
      <Switch checked={mapping.enabled} onCheckedChange={handleEnabledChange} disabled={isLoading} />

      {/* Remove button */}
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

export const FieldMappingBuilder = ({
  value,
  onChange,
  attributes,
  isLoadingAttributes,
}: FieldMappingBuilderProps) => {
  const handleAddMapping = () => {
    onChange({
      ...value,
      mappings: [...value.mappings, getDefaultFieldMapping()],
    });
  };

  const handleMappingChange = (index: number, newMapping: FieldMapping) => {
    const newMappings = [...value.mappings];
    newMappings[index] = newMapping;
    onChange({
      ...value,
      mappings: newMappings,
    });
  };

  const handleRemoveMapping = (index: number) => {
    onChange({
      ...value,
      mappings: value.mappings.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-default border-subtle rounded-2xl border p-2">
      <div className="ml-2 flex items-center gap-0.5">
        <div className="border-subtle rounded-lg border p-1">
          <Icon name="link" className="text-subtle h-4 w-4" />
        </div>
        <span className="text-emphasis ml-2 text-sm font-medium">Field Mappings</span>
      </div>

      <div className="bg-muted mt-2 space-y-2 rounded-xl p-2">
        {value.mappings.length === 0 ? (
          <div className="text-subtle py-6 text-center text-sm">
            No field mappings added. Click below to add your first mapping.
          </div>
        ) : (
          value.mappings.map((mapping, index) => (
            <MappingRow
              key={mapping.id || `new-${index}`}
              mapping={mapping}
              onChange={(newMapping) => handleMappingChange(index, newMapping)}
              onRemove={() => handleRemoveMapping(index)}
              attributes={attributes}
              isLoading={isLoadingAttributes}
            />
          ))
        )}
      </div>

      <Button
        color="minimal"
        size="sm"
        StartIcon="plus"
        className="mt-2"
        onClick={handleAddMapping}
        disabled={isLoadingAttributes}>
        Add mapping
      </Button>
    </div>
  );
};
