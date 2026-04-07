/**
 * RoutingFormFieldsEditor
 * 
 * A wrapper component that integrates FormBuilder from event-types with Routing Forms.
 * This enables reusing the booking questions UI for routing forms.
 * 
 * @see https://github.com/calcom/cal.com/issues/18987
 */

"use client";

import { useMemo, useCallback } from "react";
import type { TNonRouterField } from "@calcom/features/routing-forms/lib/zod";
import {
  transformRoutingFieldsToFormBuilder,
  transformFormBuilderToRoutingFields,
  migrateRoutingField,
  needsMigration,
} from "../lib/transformFields";

// Import types from form-builder
import type { z } from "zod";
import type { fieldSchema } from "@calcom/features/form-builder/schema";

type FormBuilderField = z.infer<typeof fieldSchema>;

interface RoutingFormFieldsEditorProps {
  /** Current routing form fields */
  fields: TNonRouterField[];
  /** Callback when fields change */
  onFieldsChange: (fields: TNonRouterField[]) => void;
  /** Optional: Disable editing for certain fields */
  disabledFieldIds?: string[];
  /** Optional: Show field type selector */
  showFieldTypes?: boolean;
}

/**
 * RoutingFormFieldsEditor Component
 * 
 * Wraps the FormBuilder component to work with routing form field format.
 * Handles automatic migration of legacy field formats.
 */
export function RoutingFormFieldsEditor({
  fields,
  onFieldsChange,
  disabledFieldIds = [],
  showFieldTypes = true,
}: RoutingFormFieldsEditorProps) {
  // Migrate legacy fields on mount
  const migratedFields = useMemo(() => {
    return fields.map((field) => {
      if (needsMigration(field)) {
        return migrateRoutingField(field);
      }
      return field;
    });
  }, [fields]);

  // Transform to FormBuilder format
  const formBuilderFields = useMemo(() => {
    return transformRoutingFieldsToFormBuilder(migratedFields);
  }, [migratedFields]);

  // Handle field changes from FormBuilder
  const handleFieldsChange = useCallback(
    (newFormBuilderFields: FormBuilderField[]) => {
      const newRoutingFields = transformFormBuilderToRoutingFields(
        newFormBuilderFields,
        migratedFields
      );
      onFieldsChange(newRoutingFields);
    },
    [migratedFields, onFieldsChange]
  );

  // For now, render a simplified field editor
  // In production, this would integrate with the full FormBuilder component
  return (
    <div className="routing-form-fields-editor space-y-4">
      {formBuilderFields.map((field, index) => (
        <RoutingFormFieldCard
          key={field.name}
          field={field}
          index={index}
          isDisabled={disabledFieldIds.includes(field.name)}
          onChange={(updatedField) => {
            const newFields = [...formBuilderFields];
            newFields[index] = updatedField;
            handleFieldsChange(newFields);
          }}
          onDelete={() => {
            const newFields = formBuilderFields.filter((_: FormBuilderField, i: number) => i !== index);
            handleFieldsChange(newFields);
          }}
        />
      ))}
      
      <AddFieldButton
        onClick={() => {
          const newField: FormBuilderField = {
            name: `field_${Date.now()}`,
            type: "text",
            label: "New Field",
            required: false,
            editable: "user",
            sources: [{ id: "user", type: "user", label: "User" }],
          };
          handleFieldsChange([...formBuilderFields, newField]);
        }}
      />
    </div>
  );
}

// Simple field card component
interface RoutingFormFieldCardProps {
  field: FormBuilderField;
  index: number;
  isDisabled: boolean;
  onChange: (field: FormBuilderField) => void;
  onDelete: () => void;
}

function RoutingFormFieldCard({
  field,
  index,
  isDisabled,
  onChange,
  onDelete,
}: RoutingFormFieldCardProps) {
  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "textarea", label: "Long Text" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "address", label: "Address" },
    { value: "select", label: "Select" },
    { value: "multiselect", label: "Multi Select" },
    { value: "radio", label: "Radio" },
    { value: "checkbox", label: "Checkbox" },
    { value: "boolean", label: "Boolean" },
    { value: "url", label: "URL" },
    { value: "multiemail", label: "Multiple Emails" },
  ];

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">
          Field #{index + 1}
        </span>
        {!isDisabled && (
          <button
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-sm"
            type="button"
          >
            Delete
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Field Label */}
        <div>
          <label className="block text-sm font-medium mb-1">Label</label>
          <input
            type="text"
            value={field.label || ""}
            onChange={(e) =>
              onChange({ ...field, label: e.target.value })
            }
            disabled={isDisabled}
            className="w-full border rounded px-3 py-2"
            placeholder="Field label"
          />
        </div>

        {/* Field Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={field.type}
            onChange={(e) =>
              onChange({
                ...field,
                type: e.target.value as FormBuilderField["type"],
              })
            }
            disabled={isDisabled}
            className="w-full border rounded px-3 py-2"
          >
            {fieldTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Field Identifier */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Identifier
          </label>
          <input
            type="text"
            value={field.name}
            onChange={(e) =>
              onChange({ ...field, name: e.target.value })
            }
            disabled={isDisabled}
            className="w-full border rounded px-3 py-2"
            placeholder="field_identifier"
          />
        </div>

        {/* Placeholder */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={field.placeholder || ""}
            onChange={(e) =>
              onChange({ ...field, placeholder: e.target.value })
            }
            disabled={isDisabled}
            className="w-full border rounded px-3 py-2"
            placeholder="Placeholder text"
          />
        </div>

        {/* Required Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id={`required-${field.name}`}
            checked={field.required || false}
            onChange={(e) =>
              onChange({ ...field, required: e.target.checked })
            }
            disabled={isDisabled}
            className="mr-2"
          />
          <label htmlFor={`required-${field.name}`} className="text-sm">
            Required field
          </label>
        </div>

        {/* Options for select/radio/checkbox */}
        {(field.type === "select" ||
          field.type === "multiselect" ||
          field.type === "radio" ||
          field.type === "checkbox") && (
          <FieldOptionsEditor
            options={field.options || []}
            onChange={(options) => onChange({ ...field, options })}
            disabled={isDisabled}
          />
        )}
      </div>
    </div>
  );
}

// Options editor component
interface FieldOptionsEditorProps {
  options: { label: string; value: string }[];
  onChange: (options: { label: string; value: string }[]) => void;
  disabled: boolean;
}

function FieldOptionsEditor({
  options,
  onChange,
  disabled,
}: FieldOptionsEditorProps) {
  return (
    <div className="border-t pt-3 mt-3">
      <label className="block text-sm font-medium mb-2">Options</label>
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={option.label}
              onChange={(e) => {
                const newOptions = [...options];
                newOptions[index] = {
                  ...option,
                  label: e.target.value,
                  value: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                };
                onChange(newOptions);
              }}
              disabled={disabled}
              className="flex-1 border rounded px-3 py-1 text-sm"
              placeholder="Option label"
            />
            {!disabled && (
              <button
                onClick={() => {
                  const newOptions = options.filter((_, i) => i !== index);
                  onChange(newOptions);
                }}
                className="text-red-500 hover:text-red-700 px-2"
                type="button"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            onClick={() => {
              onChange([...options, { label: "", value: "" }]);
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
            type="button"
          >
            + Add Option
          </button>
        )}
      </div>
    </div>
  );
}

// Add field button
function AddFieldButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
      type="button"
    >
      + Add New Field
    </button>
  );
}

export default RoutingFormFieldsEditor;
