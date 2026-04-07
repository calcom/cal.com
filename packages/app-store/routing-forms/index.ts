export * as api from "./api";

// Field transformation utilities for booking questions integration
export {
  transformRoutingFieldToFormBuilder,
  transformFormBuilderToRoutingField,
  transformRoutingFieldsToFormBuilder,
  transformFormBuilderToRoutingFields,
  transformOptionToFormBuilder,
  transformOptionToRoutingForm,
  migrateRoutingField,
  needsMigration,
} from "./lib/transformFields";

// New FormBuilder component for routing forms
export { RoutingFormFieldsEditor } from "./components/RoutingFormFieldsEditor";
export type { RoutingFormFieldsEditorProps } from "./components/RoutingFormFieldsEditor";
