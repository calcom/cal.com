import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Input, Select, Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import { getDefaultFieldMapping } from "@calcom/features/ee/integration-attribute-sync/lib/fieldMappingHelpers";
import type {
  IFieldMappingFormState,
  IFieldMappingWithOptionalId,
} from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";

type AttributeOptions = {
  label: string;
  value: string;
}[];

interface FieldMappingBuilderProps {
  value: IFieldMappingFormState;
  onChange: (value: IFieldMappingFormState) => void;
  attributeOptions: AttributeOptions;
  isLoadingAttributes?: boolean;
}

interface MappingRowProps {
  mapping: IFieldMappingWithOptionalId;
  onChange: (mapping: IFieldMappingWithOptionalId) => void;
  onRemove: () => void;
  attributeOptions: AttributeOptions;
  isLoading?: boolean;
  error?: string;
}

const MappingRow = ({ mapping, onChange, onRemove, attributeOptions, isLoading, error }: MappingRowProps) => {
  const { t } = useLocale();

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
    <div>
      <div
        className={`bg-default border-subtle flex flex-wrap items-center gap-3 rounded-lg border p-3 ${error ? "border-red-500" : ""}`}>
        <div className="flex-1" style={{ minWidth: "200px" }}>
          <Input
            type="text"
            value={mapping.integrationFieldName}
            onChange={handleFieldNameChange}
            disabled={isLoading}
            placeholder={t("attribute_sync_field_placeholder")}
            className="h-7 text-sm"
          />
        </div>

        <Icon name="arrow-right" className="text-subtle h-4 w-4" />

        <div className="flex-1" style={{ minWidth: "200px" }}>
          <Select
            size="sm"
            placeholder={t("attribute_sync_select_attribute")}
            options={attributeOptions}
            value={selectedAttribute}
            onChange={handleAttributeChange}
            isLoading={isLoading}
            isDisabled={isLoading}
            className="w-full"
          />
        </div>

        <Switch checked={mapping.enabled} onCheckedChange={handleEnabledChange} disabled={isLoading} />

        <Button
          color="minimal"
          size="sm"
          StartIcon="trash-2"
          onClick={onRemove}
          disabled={isLoading}
          className="text-subtle hover:text-default"
          aria-label={t("remove")}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export const FieldMappingBuilder = ({
  value,
  onChange,
  attributeOptions,
  isLoadingAttributes,
}: FieldMappingBuilderProps) => {
  const { t } = useLocale();

  // Find indices of rows with duplicate attribute mappings
  const duplicateIndices = new Set<number>();
  const seenAttributes = new Map<string, number>(); // attributeId -> first index
  value.mappings.forEach((mapping: IFieldMappingWithOptionalId, index: number) => {
    if (mapping.attributeId) {
      const firstIndex = seenAttributes.get(mapping.attributeId);
      if (firstIndex !== undefined) {
        // Mark both the first occurrence and current as duplicates
        duplicateIndices.add(firstIndex);
        duplicateIndices.add(index);
      } else {
        seenAttributes.set(mapping.attributeId, index);
      }
    }
  });

  const handleAddMapping = () => {
    onChange({
      ...value,
      mappings: [...value.mappings, getDefaultFieldMapping()],
    });
  };

  const handleMappingChange = (index: number, newMapping: IFieldMappingWithOptionalId) => {
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
      mappings: value.mappings.filter((_: IFieldMappingWithOptionalId, i: number) => i !== index),
    });
  };

  return (
    <div className="bg-default border-subtle rounded-2xl border p-2">
      <div className="ml-2 flex items-center gap-0.5">
        <div className="border-subtle rounded-lg border p-1">
          <Icon name="link" className="text-subtle h-4 w-4" />
        </div>
        <span className="text-emphasis ml-2 text-sm font-medium">{t("attribute_sync_field_mappings")}</span>
      </div>

      <div className="bg-muted mt-2 space-y-2 rounded-xl p-2">
        {value.mappings.length === 0 ? (
          <div className="text-subtle py-6 text-center text-sm">{t("attribute_sync_no_mappings")}</div>
        ) : (
          value.mappings.map((mapping: IFieldMappingWithOptionalId, index: number) => (
            <MappingRow
              key={mapping.id || `new-${index}`}
              mapping={mapping}
              onChange={(newMapping) => handleMappingChange(index, newMapping)}
              onRemove={() => handleRemoveMapping(index)}
              attributeOptions={attributeOptions}
              isLoading={isLoadingAttributes}
              error={
                duplicateIndices.has(index) ? t("attribute_sync_duplicate_attribute_mapping") : undefined
              }
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
        {t("attribute_sync_add_mapping")}
      </Button>
    </div>
  );
};
