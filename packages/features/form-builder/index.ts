/**
 * form-builder/index.ts
 *
 * Public API of the form-builder module.
 * Import from here rather than from individual files.
 */
export { FormBuilderPage } from "./FormBuilderPage";
export { FieldLibrary } from "./FieldLibrary";
export { FormCanvas } from "./FormCanvas";
export { FieldSettingsPanel } from "./FieldSettingsPanel";
export { FieldRenderer } from "./FieldRenderer";
export { migrateFields, enrichFieldWithUIConfig } from "./migrateFields";
export type {
  BuilderField,
  UIFieldType,
  UIFieldConfig,
  BackendOption,
  FieldLibraryEntry,
  FormLevelConfig,
  FormHeaderConfig,
  FormStyleConfig,
  SubmitButtonConfig,
} from "./builderTypes";
export {
  FIELD_LIBRARY_CONFIG,
  LAYOUT_ONLY_TYPES,
  NEEDS_OPTIONS,
  createBuilderField,
  labelToIdentifier,
  toBackendOptions,
  toUIOptions,
  DEFAULT_FORM_CONFIG,
} from "./builderTypes";