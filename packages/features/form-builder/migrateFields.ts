/**
 * migrateFields.ts
 *
 * When an existing saved form is loaded, its fields may not have `uiConfig`.
 * This utility enriches them with sensible UI defaults without altering
 * any backend-required properties.
 *
 * Called once in FormBuilderPage when fields are first loaded from the DB,
 * by patching hookForm via reset() or setValue() BEFORE the builder renders.
 *
 * It is safe to call multiple times (idempotent).
 */
import type { BuilderField, UIFieldConfig, UIFieldType } from "./components/builderTypes";
import { LAYOUT_ONLY_TYPES } from "./components/builderTypes";

/**
 * Enrich a single raw field from DB with UI defaults.
 * Does not overwrite any existing uiConfig keys.
 */
export function enrichFieldWithUIConfig(rawField: Record<string, any>): BuilderField {
  const type = rawField.type as UIFieldType;
  const isLayout = LAYOUT_ONLY_TYPES.has(type);
  const needsOptions = ["select", "multiselect", "radio", "checkbox"].includes(type);

  const existingUIConfig: UIFieldConfig = rawField.uiConfig ?? {};

  const contentFromLabel =
    isLayout && typeof rawField.label === "string" && rawField.label.trim().length > 0
      ? rawField.label
      : undefined;

  const defaults: UIFieldConfig = {};
  if (existingUIConfig.layout === "half") defaults.layout = "half";
  if (typeof existingUIConfig.helpText === "string" && existingUIConfig.helpText.trim().length > 0) {
    defaults.helpText = existingUIConfig.helpText;
  }
  if (typeof existingUIConfig.content === "string" && existingUIConfig.content.trim().length > 0) {
    defaults.content = existingUIConfig.content;
  } else if (contentFromLabel) {
    defaults.content = contentFromLabel;
  }
  if (existingUIConfig.checkboxDirection || type === "checkbox") {
    defaults.checkboxDirection = existingUIConfig.checkboxDirection ?? "column";
  }
  if (existingUIConfig.checkboxVariant || type === "checkbox") {
    defaults.checkboxVariant = existingUIConfig.checkboxVariant ?? "default";
  }
  if (existingUIConfig.radioDirection || type === "radio") {
    defaults.radioDirection = existingUIConfig.radioDirection ?? "column";
  }
  if (existingUIConfig.radioVariant || type === "radio") {
    defaults.radioVariant = existingUIConfig.radioVariant ?? "default";
  }
  if (existingUIConfig.datePickerVariant && type === "date") {
    defaults.datePickerVariant = existingUIConfig.datePickerVariant;
  }
  if ((existingUIConfig as { hideLabel?: boolean }).hideLabel) {
    (defaults as UIFieldConfig & { hideLabel?: boolean }).hideLabel = true;
  }
  if (existingUIConfig.validation?.minChars) {
    defaults.validation = { minChars: existingUIConfig.validation.minChars };
  }

  // Normalise options to {label, id} format if they arrive as legacy selectText
  let options = rawField.options;
  if (!options && rawField.selectText) {
    // Legacy selectText: comma-separated string
    const labels: string[] = (rawField.selectText as string)
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    options = labels.map((l: string) => ({ label: l, id: l }));
  }

  const labelText = typeof rawField.label === "string" ? rawField.label.trim() : "";
  const placeholderText = typeof rawField.placeholder === "string" ? rawField.placeholder.trim() : "";

  return {
    ...rawField,
    label: labelText,
    placeholder:
      type === "attachment"
        ? undefined
        : placeholderText.length > 0
        ? placeholderText
        : undefined,
    required: rawField.required ? true : undefined,
    identifier: isLayout
      ? undefined
      : rawField.identifier ||
        (labelText ? labelText.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") : undefined) ||
        rawField.id,
    options,
    uiConfig: Object.keys(defaults).length ? defaults : undefined,
  } as BuilderField;
}

/**
 * Enrich an entire fields array from DB.
 * Skips deleted fields but preserves them in place (backend needs them).
 */
export function migrateFields(fields: Record<string, any>[] | null | undefined): BuilderField[] {
  if (!fields) return [];
  return fields.map((f) => enrichFieldWithUIConfig(f));
}
