/**
 * builderTypes.ts — bridge between new UI and existing backend schema.
 *
 * Backend (zodNonRouterField) stores:
 *   id, label, identifier, type (z.string()), required, options ({label,id}[]),
 *   deleted, placeholder, routerId
 *
 * UI extras stored under field.uiConfig (passed through, ignored by backend):
 *   layout, helpText, content, checkboxDirection, checkboxVariant
 *
 * Form-level visual config (header, styles, submitButton) is LOCAL STATE only
 * — not persisted to backend in this iteration.
 */

// ─── Backend option format ─────────────────────────────────────────────────────
export interface BackendOption {
  label: string;
  id: string | null;
}

// ─── UI config stored on each field (uiConfig key) ────────────────────────────
export interface UIFieldConfig {
  layout?: "full" | "half";
  helpText?: string;
  content?: string;            // for heading / paragraph layout fields
  checkboxDirection?: "row" | "column";
  checkboxVariant?: "default" | "largeSquare";
  radioDirection?: "row" | "column";
  radioVariant?: "default" | "largeSquare";
  datePickerVariant?: "default" | "compact";
  validation?: {
    minChars?: number;
  };
}

// ─── Full builder field (superset of zodNonRouterField) ───────────────────────
export interface BuilderField {
  // Backend-required
  id: string;
  label: string;
  identifier?: string;
  type: string;
  required?: boolean;
  deleted?: boolean;
  placeholder?: string;
  options?: BackendOption[];
  routerId?: string;           // never overwrite — router-linked fields
  // UI-only
  uiConfig?: UIFieldConfig;
}

// ─── UI field type enum ────────────────────────────────────────────────────────
export type UIFieldType =
  | "text" | "textarea" | "number" | "email" | "phone"
  | "address" | "url" | "multiemail" | "attachment" | "date" | "time" | "calendar"
  | "select" | "multiselect" | "radio" | "checkbox" | "boolean"
  | "divider" | "heading" | "paragraph";

// Layout-only types — stored in array but no routing/identifier needed
export const LAYOUT_ONLY_TYPES = new Set<string>([
  "divider", "heading", "paragraph",
]);

// Types that need an options array
export const NEEDS_OPTIONS = new Set<string>([
  "select", "multiselect", "radio", "checkbox",
]);

// ─── Field library config ──────────────────────────────────────────────────────
export interface FieldLibraryEntry {
  type: UIFieldType;
  label: string;
  icon: string;
  category: "input" | "selection" | "layout";
}

export const FIELD_LIBRARY_CONFIG: FieldLibraryEntry[] = [
  { type: "text",        label: "Short Text",     icon: "Type",        category: "input" },
  { type: "textarea",    label: "Long Text",      icon: "AlignLeft",   category: "input" },
  { type: "number",      label: "Number",         icon: "Hash",        category: "input" },
  { type: "email",       label: "Email",          icon: "Mail",        category: "input" },
  { type: "phone",       label: "Phone",          icon: "Phone",       category: "input" },
  { type: "address",     label: "Address",        icon: "MapPin",      category: "input" },
  { type: "url",         label: "URL",            icon: "Link",        category: "input" },
  { type: "multiemail",  label: "Multi Email",    icon: "MailPlus",    category: "input" },
  { type: "date",        label: "Date",           icon: "Calendar",    category: "input" },
  { type: "time",        label: "Time",           icon: "Clock",       category: "input" },
  { type: "calendar",    label: "Calendar",       icon: "CalendarDays", category: "input" },
  { type: "select",      label: "Dropdown",       icon: "ChevronDown", category: "selection" },
  { type: "multiselect", label: "Multi Select",   icon: "ListChecks",  category: "selection" },
  { type: "radio",       label: "Radio Group",    icon: "Circle",      category: "selection" },
  { type: "checkbox",    label: "Checkbox Group", icon: "CheckSquare", category: "selection" },
  { type: "boolean",     label: "Single Checkbox", icon: "ToggleLeft",  category: "selection" },
  { type: "divider",     label: "Divider",        icon: "Minus",       category: "layout" },
  { type: "heading",     label: "Heading",        icon: "Heading",     category: "layout" },
  { type: "paragraph",   label: "Paragraph",      icon: "FileText",    category: "layout" },
];

// ─── Form-level visual config (local state, not persisted) ────────────────────
export interface FormHeaderConfig {
  title: string;
  subtitle: string;
  alignment: "left" | "center" | "right";
  titleSize: number;
  subtitleSize: number;
  spacingBottom: number;
  titleColor: string;
  subtitleColor: string;
}

export interface FormStyleConfig {
  fieldStyle: "default" | "underline";
  accentColor: string;
  secondaryColor: string;
  fontLabel: string;
  background: {
    type: "none" | "color" | "image";
    color: string;
    imageUrl: string;
    overlayOpacity: number;
    blur: number;
  };
  formWidth: number;
  bgColor: string;
  borderRadius: number;
  padding: number;
}

export interface SubmitButtonConfig {
  text: string;
  color: string;
  textColor: string;
  borderRadius: number;
  alignment: "left" | "center" | "right";
  width: "auto" | "full";
}

export interface FormLevelConfig {
  header: FormHeaderConfig;
  style: FormStyleConfig;
  submitButton: SubmitButtonConfig;
}

export const DEFAULT_FORM_CONFIG: FormLevelConfig = {
  header: {
    title: "",
    subtitle: "",
    alignment: "left",
    titleSize: 20,
    subtitleSize: 14,
    spacingBottom: 24,
    titleColor: "",
    subtitleColor: "",
  },
  style: {
    fieldStyle: "default",
    accentColor: "#2563eb",
    secondaryColor: "#94a3b8",
    fontLabel: "Inter",
    background: {
      type: "none",
      color: "",
      imageUrl: "",
      overlayOpacity: 0.4,
      blur: 8,
    },
    formWidth: 768,
    bgColor: "",
    borderRadius: 8,
    padding: 32,
  },
  submitButton: {
    text: "Submit",
    color: "",
    textColor: "",
    borderRadius: 6,
    alignment: "left",
    width: "auto",
  },
};

export function resolveFormConfig(
  partial?: Partial<FormLevelConfig> | null,
  fallbackHeader?: Partial<FormHeaderConfig>
): FormLevelConfig {
  const resolved: FormLevelConfig = {
    header: {
      ...DEFAULT_FORM_CONFIG.header,
      ...(partial?.header ?? {}),
    },
    style: {
      ...DEFAULT_FORM_CONFIG.style,
      ...(partial?.style ?? {}),
    },
    submitButton: {
      ...DEFAULT_FORM_CONFIG.submitButton,
      ...(partial?.submitButton ?? {}),
    },
  };

  if (!partial && fallbackHeader) {
    resolved.header = {
      ...resolved.header,
      ...fallbackHeader,
    };
  }

  return resolved;
}

export type FormFontStyle = {
  fontFamily: string;
  fontStyle: "normal" | "italic" | "oblique";
  fontWeight: number;
};

export type FormFontOption = {
  label: string;
  value: string;
  style: FormFontStyle;
};

export const FORM_FONT_OPTIONS: FormFontOption[] = [
  {
    label: "Inter",
    value: "Inter",
    style: {
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "Roboto",
    value: "Roboto",
    style: {
      fontFamily: "Roboto, system-ui, -apple-system, Segoe UI, sans-serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "Poppins",
    value: "Poppins",
    style: {
      fontFamily: "Poppins, system-ui, -apple-system, Segoe UI, sans-serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "Montserrat",
    value: "Montserrat",
    style: {
      fontFamily: "Montserrat, system-ui, -apple-system, Segoe UI, sans-serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "Source Sans 3",
    value: "Source Sans 3",
    style: {
      fontFamily: "\"Source Sans 3\", system-ui, -apple-system, Segoe UI, sans-serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "IBM Plex Sans",
    value: "IBM Plex Sans",
    style: {
      fontFamily: "\"IBM Plex Sans\", system-ui, -apple-system, Segoe UI, sans-serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "Lora",
    value: "Lora",
    style: {
      fontFamily: "Lora, Georgia, serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "Merriweather",
    value: "Merriweather",
    style: {
      fontFamily: "Merriweather, Georgia, serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
  {
    label: "Adobe Garamond Pro",
    value: "Adobe Garamond Pro",
    style: {
      fontFamily: "\"adobe-garamond-pro\", serif",
      fontStyle: "normal",
      fontWeight: 400,
    },
  },
];

export const DEFAULT_FORM_FONT = FORM_FONT_OPTIONS[0];

export function resolveFormFontStyle(label: string): FormFontStyle {
  const match = FORM_FONT_OPTIONS.find((option) => option.label === label);
  return (match ?? DEFAULT_FORM_FONT).style;
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

export function labelToIdentifier(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function toBackendOptions(labels: string[]): BackendOption[] {
  return labels.map((l) => ({ label: l, id: l }));
}

export function toUIOptions(options: BackendOption[] | undefined): string[] {
  if (!options) return [];
  return options.map((o) => o.label);
}

export function createBuilderField(type: UIFieldType): BuilderField {
  const isLayout = LAYOUT_ONLY_TYPES.has(type);
  const needsOptions = NEEDS_OPTIONS.has(type);
  const uiConfig: UIFieldConfig = {};

  if (type === "checkbox") {
    uiConfig.checkboxDirection = "column";
    uiConfig.checkboxVariant = "default";
  }

  if (isLayout) {
    if (type === "heading") uiConfig.content = "Section Title";
    if (type === "paragraph") uiConfig.content = "Enter your description here.";
  }

  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: "",
    identifier: isLayout ? undefined : "",
    type,
    options: needsOptions ? toBackendOptions(["Option 1", "Option 2"]) : undefined,
    uiConfig: Object.keys(uiConfig).length ? uiConfig : undefined,
  };
}
