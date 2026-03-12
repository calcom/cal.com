/**
 * FieldSettingsPanel.tsx
 *
 * Right panel with four tabs: Field | Header | Style | Submit
 *
 * CRITICAL: All field edits call onUpdate/onUpdateUIConfig which write directly
 * to hookForm via setValue. This component owns NO field data — it is purely
 * controlled. The parent (FormBuilderPage) passes the live field derived from
 * hookForm.watch("fields")[selectedIndex].
 *
 * Input: @calid/features/ui/components/input/input — controlled, requires value + onChange
 * Switch: @calid/features/ui/components/switch/switch — Radix, uses checked + onCheckedChange
 */
import React, { useState } from "react";
import { Trash2, Copy, Plus, X } from "lucide-react";
import { Input } from "@calid/features/ui/components/input/input";
import { Switch } from "@calid/features/ui/components/switch/switch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ColorPicker, Select, Slider } from "@calcom/ui/components/form";
import type {
  BuilderField,
  BackendOption,
  FormLevelConfig,
  FormHeaderConfig,
  FormStyleConfig,
  SubmitButtonConfig,
} from "./builderTypes";
import {
  DEFAULT_FORM_FONT,
  FORM_FONT_OPTIONS,
  LAYOUT_ONLY_TYPES,
  NEEDS_OPTIONS,
  toUIOptions,
  labelToIdentifier,
} from "./builderTypes";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface FieldSettingsPanelProps {
  field: BuilderField | null;
  selectedIndex: number | null;
  formConfig: FormLevelConfig;
  onUpdate: (updates: Partial<BuilderField>) => void;
  onUpdateUIConfig: (updates: Partial<BuilderField["uiConfig"]>) => void;
  onUpdateFormConfig: (updates: Partial<FormLevelConfig>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

type PanelTab = "field" | "header" | "style" | "submit";

// ─── Small reusable atoms ──────────────────────────────────────────────────────

function FieldLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs font-medium text-default mb-1 ${className}`}>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2 mt-4 first:mt-0">
      {children}
    </p>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 p-0.5 bg-subtle rounded-md">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${
            value === opt.value
              ? "bg-default text-default shadow-sm"
              : "text-muted hover:text-default"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  placeholder = "#000000",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <ColorPicker
        defaultValue={value || placeholder}
        onChange={onChange}
        className="h-8 text-xs font-mono"
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <FieldLabel className="mb-0">{label}</FieldLabel>
        <span className="text-xs text-muted tabular-nums">{value}{unit}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => {
          const nextValue = next?.[0];
          if (typeof nextValue === "number") {
            onChange(nextValue);
          }
        }}
      />
    </div>
  );
}

// ─── Options editor ────────────────────────────────────────────────────────────

function OptionsEditor({
  options,
  onChange,
}: {
  options: BackendOption[];
  onChange: (opts: BackendOption[]) => void;
}) {
  const { t } = useLocale();
  const labels = toUIOptions(options);

  const update = (i: number, newLabel: string) => {
    onChange(options.map((opt, idx) => (idx === i ? { label: newLabel, id: newLabel } : opt)));
  };
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => {
    const next = t("form_builder_option_number", { number: options.length + 1 });
    onChange([...options, { label: next, id: next }]);
  };

  return (
    <div className="space-y-1.5">
      {labels.map((lbl, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={lbl}
            onChange={(e) => update(i, e.target.value)}
            className="h-8 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded border border-default hover:bg-error/10 hover:border-error transition-colors"
          >
            <X className="h-3 w-3 text-error" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-default py-1.5 text-xs text-muted hover:bg-subtle hover:text-default transition-colors"
      >
        <Plus className="h-3 w-3" />
        {t("form_builder_add_option")}
      </button>
    </div>
  );
}

// ─── FIELD tab ────────────────────────────────────────────────────────────────

function FieldTab({
  field,
  onUpdate,
  onUpdateUIConfig,
  onDelete,
  onDuplicate,
}: {
  field: BuilderField | null;
  onUpdate: (u: Partial<BuilderField>) => void;
  onUpdateUIConfig: (u: Partial<BuilderField["uiConfig"]>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { t } = useLocale();
  if (!field) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-xs text-muted leading-relaxed">
          {t("form_builder_select_field")}
          <br />
          {t("form_builder_to_edit_properties")}
        </p>
      </div>
    );
  }

  const isLayout = LAYOUT_ONLY_TYPES.has(field.type);
  const isTextLayout = field.type === "heading" || field.type === "paragraph";
  const needsOptions = NEEDS_OPTIONS.has(field.type);
  const uiConfig = field.uiConfig ?? {};
  const validation = uiConfig.validation ?? {};
  const isTextareaField = field.type === "textarea";

  const updateValidation = (updates: Partial<typeof validation>) => {
    const nextValidation = { ...validation, ...updates };
    const cleaned = {
      minChars:
        typeof nextValidation.minChars === "number" && nextValidation.minChars > 0
          ? nextValidation.minChars
          : undefined,
    };
    const hasAny = typeof cleaned.minChars === "number";
    onUpdateUIConfig({
      validation: hasAny ? cleaned : undefined,
    });
  };

  const handleLabelChange = (newLabel: string) => {
    const hasContent = newLabel.trim().length > 0;
    if (isTextLayout) {
      onUpdateUIConfig({ content: hasContent ? newLabel : undefined });
      onUpdate({ label: undefined });
      return;
    }
    const derived = labelToIdentifier(field.label ?? "");
    const currentId = field.identifier ?? "";
    // auto-sync identifier if it still matches the label-derived value
    const shouldSync = !currentId || currentId === derived;
    onUpdate({
      label: hasContent ? newLabel : undefined,
      ...(shouldSync
        ? { identifier: hasContent ? labelToIdentifier(newLabel) : undefined }
        : {}),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {/* Label */}
      {!isTextLayout && (
        <div className="space-y-1">
          <FieldLabel>{t("label")}</FieldLabel>
          <Input
            value={field.label ?? ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder={t("form_builder_field_label_placeholder")}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Content for heading / paragraph */}
      {isTextLayout && (
        <div className="space-y-1">
          <FieldLabel>{t("form_builder_content")}</FieldLabel>
          <textarea
            value={uiConfig.content ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              onUpdateUIConfig({ content: next.trim().length ? next : undefined });
            }}
            rows={3}
            placeholder={
              field.type === "heading"
                ? t("form_builder_section_heading")
                : t("form_builder_paragraph_body")
            }
            className="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-default placeholder:text-muted resize-none focus:outline-none shadow-outline-gray-rested hover:border-emphasis transition"
          />
        </div>
      )}

      {!isLayout && (
        <>
          {/* Identifier */}
          <div className="space-y-1">
            <FieldLabel>
              {t("form_builder_identifier")}{" "}
              <span className="font-normal text-muted">({t("form_builder_routing")})</span>
            </FieldLabel>
            <Input
              value={field.identifier ?? ""}
              onChange={(e) => {
                const next = e.target.value;
                const normalized = labelToIdentifier(next);
                onUpdate({ identifier: normalized || undefined });
              }}
              placeholder={t("form_builder_auto_from_label")}
              className="h-8 text-xs font-mono"
            />
          </div>

          {/* Placeholder */}
          {field.type !== "attachment" && (
            <div className="space-y-1">
              <FieldLabel>{t("placeholder")}</FieldLabel>
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) => {
                  const next = e.target.value;
                  onUpdate({ placeholder: next.trim().length ? next : undefined });
                }}
                placeholder={t("form_builder_placeholder_text")}
                className="h-8 text-sm"
              />
            </div>
          )}

          {field.type === "date" && (
            <div className="space-y-1">
              <FieldLabel>{t("form_builder_date_picker_variant")}</FieldLabel>
              <SegmentedControl
                value={uiConfig.datePickerVariant ?? "default"}
                options={[
                  { label: t("default"), value: "default" as const },
                  { label: t("form_builder_compact"), value: "compact" as const },
                ]}
                onChange={(v) => onUpdateUIConfig({ datePickerVariant: v })}
              />
            </div>
          )}

          {/* Required */}
          <div className="flex items-center justify-between py-0.5">
            <FieldLabel className="mb-0">{t("required")}</FieldLabel>
            <Switch
              checked={!!field.required}
              onCheckedChange={(checked) => onUpdate({ required: checked ? true : undefined })}
              size="sm"
            />
          </div>

          {/* Help text */}
          <div className="space-y-1">
            <FieldLabel>{t("form_builder_help_text")}</FieldLabel>
            <Input
              value={uiConfig.helpText ?? ""}
              onChange={(e) => {
                const next = e.target.value;
                onUpdateUIConfig({ helpText: next.trim().length ? next : undefined });
              }}
              placeholder={t("form_builder_help_text_placeholder")}
              className="h-8 text-sm"
            />
          </div>

          {/* Width */}
          <div className="space-y-1">
            <FieldLabel>{t("form_builder_width")}</FieldLabel>
            <SegmentedControl
              value={uiConfig.layout ?? "full"}
              options={[
                { label: t("form_builder_half"), value: "half" as const },
                { label: t("form_builder_full"), value: "full" as const },
              ]}
              onChange={(v) => onUpdateUIConfig({ layout: v === "half" ? "half" : undefined })}
            />
          </div>

          {/* Validation */}
          {isTextareaField && <SectionTitle>{t("form_builder_validation")}</SectionTitle>}

          {isTextareaField && (
            <div className="space-y-1">
              <FieldLabel>{t("min_characters")}</FieldLabel>
              <Input
                type="number"
                min={0}
                value={validation.minChars ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const nextValue = raw === "" ? undefined : Math.max(0, parseInt(raw, 10) || 0);
                  updateValidation({ minChars: nextValue });
                }}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
          )}

          {/* Checkbox / Radio direction */}
          {(field.type === "checkbox" || field.type === "radio") && (
            <>
              <div className="space-y-1">
                <FieldLabel>
                  {field.type === "checkbox"
                    ? t("form_builder_checkbox_style")
                    : t("form_builder_radio_style")}
                </FieldLabel>
                <SegmentedControl
                  value={
                    field.type === "checkbox"
                      ? uiConfig.checkboxVariant ?? "default"
                      : uiConfig.radioVariant ?? "default"
                  }
                  options={[
                    { label: t("default"), value: "default" as const },
                    { label: t("form_builder_large"), value: "largeSquare" as const },
                  ]}
                  onChange={(v) =>
                    onUpdateUIConfig(
                      field.type === "checkbox" ? { checkboxVariant: v } : { radioVariant: v }
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>{t("form_builder_option_layout")}</FieldLabel>
                <SegmentedControl
                  value={
                    field.type === "checkbox"
                      ? uiConfig.checkboxDirection ?? "column"
                      : uiConfig.radioDirection ?? "column"
                  }
                  options={[
                    { label: t("form_builder_vertical"), value: "column" as const },
                    { label: t("form_builder_horizontal"), value: "row" as const },
                  ]}
                  onChange={(v) =>
                    onUpdateUIConfig(
                      field.type === "checkbox" ? { checkboxDirection: v } : { radioDirection: v }
                    )
                  }
                />
              </div>
            </>
          )}

          {/* Options */}
          {needsOptions && (
            <>
              <SectionTitle>{t("options")}</SectionTitle>
              <OptionsEditor
                options={field.options ?? []}
                onChange={(opts) => onUpdate({ options: opts })}
              />
            </>
          )}
        </>
      )}

      {/* Duplicate / Delete */}
      <div className="pt-2 border-t border-default">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-default h-8 text-xs font-medium text-default hover:bg-subtle transition-colors"
          >
            <Copy className="h-3 w-3" />
            {t("duplicate")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-error/40 h-8 text-xs font-medium text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            {t("delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HEADER tab ───────────────────────────────────────────────────────────────

function HeaderTab({
  config,
  onChange,
}: {
  config: FormHeaderConfig;
  onChange: (u: Partial<FormHeaderConfig>) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="space-y-1">
        <FieldLabel>{t("title")}</FieldLabel>
        <Input
          value={config.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t("form_builder_form_title_placeholder")}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <FieldLabel>{t("form_builder_subtitle")}</FieldLabel>
        <Input
          value={config.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder={t("form_builder_optional_subtitle")}
          className="h-8 text-sm"
        />
      </div>
      <SliderRow
        label={t("form_builder_title_size")}
        value={config.titleSize}
        min={16}
        max={36}
        step={1}
        onChange={(v) => onChange({ titleSize: v })}
      />
      <ColorRow
        label={t("form_builder_title_color")}
        value={config.titleColor}
        onChange={(v) => onChange({ titleColor: v })}
        placeholder="#111827"
      />
      <SliderRow
        label={t("form_builder_subtitle_size")}
        value={config.subtitleSize}
        min={12}
        max={24}
        step={1}
        onChange={(v) => onChange({ subtitleSize: v })}
      />
      <ColorRow
        label={t("form_builder_subtitle_color")}
        value={config.subtitleColor}
        onChange={(v) => onChange({ subtitleColor: v })}
        placeholder="#6b7280"
      />
      <SliderRow
        label={t("form_builder_header_spacing")}
        value={config.spacingBottom}
        min={0}
        max={48}
        step={2}
        onChange={(v) => onChange({ spacingBottom: v })}
      />
      <div className="space-y-1">
        <FieldLabel>{t("form_builder_alignment")}</FieldLabel>
        <SegmentedControl
          value={config.alignment}
          options={[
            { label: t("form_builder_left"), value: "left" as const },
            { label: t("form_builder_center"), value: "center" as const },
            { label: t("form_builder_right"), value: "right" as const },
          ]}
          onChange={(v) => onChange({ alignment: v })}
        />
      </div>
    </div>
  );
}

// ─── STYLE tab ────────────────────────────────────────────────────────────────

function StyleTab({
  config,
  onChange,
}: {
  config: FormStyleConfig;
  onChange: (u: Partial<FormStyleConfig>) => void;
}) {
  const { t } = useLocale();
  const background = config.background;
  const selectedFont =
    FORM_FONT_OPTIONS.find((opt) => opt.label === config.fontLabel) ?? DEFAULT_FORM_FONT;
  const backgroundOptions = [
    { label: t("none"), value: "none" as const },
    { label: t("form_builder_color"), value: "color" as const },
    { label: t("form_builder_image"), value: "image" as const },
  ];
  const selectedBackground = backgroundOptions.find((opt) => opt.value === background.type) ?? null;
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <SectionTitle>{t("form_builder_field_appearance")}</SectionTitle>
      <div className="space-y-1">
        <FieldLabel>{t("form_builder_font_family")}</FieldLabel>
        <Select
          value={selectedFont}
          options={FORM_FONT_OPTIONS}
          size="sm"
          onChange={(option) =>
            onChange({
              fontLabel: option?.value ?? DEFAULT_FORM_FONT.value,
            })
          }
        />
      </div>
      <SegmentedControl
        value={config.fieldStyle}
        options={[
          { label: t("default"), value: "default" as const },
          { label: t("form_builder_underline"), value: "underline" as const },
        ]}
        onChange={(v) => onChange({ fieldStyle: v })}
      />
      <ColorRow
        label={t("form_builder_accent_color")}
        value={config.accentColor}
        onChange={(v) => onChange({ accentColor: v })}
        placeholder="#2563eb"
      />
      <ColorRow
        label={t("form_builder_secondary_color")}
        value={config.secondaryColor}
        onChange={(v) => onChange({ secondaryColor: v })}
        placeholder="#94a3b8"
      />

      <SectionTitle>{t("form_builder_form_card")}</SectionTitle>
      <ColorRow
        label={t("form_builder_background")}
        value={config.bgColor}
        onChange={(v) => onChange({ bgColor: v })}
        placeholder="#ffffff"
      />
      <SliderRow
        label={t("form_builder_border_radius")}
        value={config.borderRadius}
        min={0}
        max={24}
        step={2}
        onChange={(v) => onChange({ borderRadius: v })}
      />
      <SliderRow
        label={t("form_builder_padding")}
        value={config.padding}
        min={16}
        max={80}
        step={4}
        onChange={(v) => onChange({ padding: v })}
      />

      <SectionTitle>{t("form_builder_form_background")}</SectionTitle>
      <div className="space-y-1">
        <FieldLabel>{t("form_builder_background_type")}</FieldLabel>
        <Select
          value={selectedBackground}
          options={backgroundOptions}
          size="sm"
          onChange={(option) =>
            onChange({
              background: {
                ...background,
                type:
                  (option?.value as FormStyleConfig["background"]["type"]) ??
                  "none",
              },
            })
          }
        />
      </div>

      {background.type === "color" && (
        <ColorRow
          label={t("form_builder_background_color")}
          value={background.color}
          onChange={(v) =>
            onChange({
              background: {
                ...background,
                color: v,
              },
            })
          }
          placeholder="#f3f4f6"
        />
      )}

      {background.type === "image" && (
        <>
          <div className="space-y-1">
            <FieldLabel>{t("form_builder_image_url")}</FieldLabel>
            <Input
              value={background.imageUrl}
              onChange={(e) =>
                onChange({
                  background: {
                    ...background,
                    imageUrl: e.target.value,
                  },
                })
              }
              placeholder={t("form_builder_image_url_placeholder")}
              className="h-8 text-sm"
            />
          </div>
          <SliderRow
            label={t("form_builder_overlay_opacity")}
            value={Math.round(background.overlayOpacity * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(v) =>
              onChange({
                background: {
                  ...background,
                  overlayOpacity: v / 100,
                },
              })
            }
          />
          <SliderRow
            label={t("form_builder_blur")}
            value={background.blur}
            min={0}
            max={20}
            step={1}
            onChange={(v) =>
              onChange({
                background: {
                  ...background,
                  blur: v,
                },
              })
            }
          />
        </>
      )}

      <SectionTitle>{t("layout")}</SectionTitle>
      <SliderRow
        label={t("form_builder_form_width")}
        value={config.formWidth}
        min={400}
        max={1200}
        step={50}
        onChange={(v) => onChange({ formWidth: v })}
      />
    </div>
  );
}

// ─── SUBMIT tab ───────────────────────────────────────────────────────────────

function SubmitTab({
  config,
  onChange,
}: {
  config: SubmitButtonConfig;
  onChange: (u: Partial<SubmitButtonConfig>) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="space-y-1">
        <FieldLabel>{t("form_builder_button_text")}</FieldLabel>
        <Input
          value={config.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={t("submit")}
          className="h-8 text-sm"
        />
      </div>
      <ColorRow
        label={t("form_builder_background")}
        value={config.color}
        onChange={(v) => onChange({ color: v })}
        placeholder="#171717"
      />
      <ColorRow
        label={t("form_builder_text_color")}
        value={config.textColor}
        onChange={(v) => onChange({ textColor: v })}
        placeholder="#ffffff"
      />
      <SliderRow
        label={t("form_builder_border_radius")}
        value={config.borderRadius}
        min={0}
        max={40}
        step={2}
        onChange={(v) => onChange({ borderRadius: v })}
      />
      <div className="space-y-1">
        <FieldLabel>{t("form_builder_alignment")}</FieldLabel>
        <SegmentedControl
          value={config.alignment}
          options={[
            { label: t("form_builder_left"), value: "left" as const },
            { label: t("form_builder_center"), value: "center" as const },
            { label: t("form_builder_right"), value: "right" as const },
          ]}
          onChange={(v) => onChange({ alignment: v })}
        />
      </div>
      <div className="space-y-1">
        <FieldLabel>{t("form_builder_width")}</FieldLabel>
        <SegmentedControl
          value={config.width}
          options={[
            { label: t("form_builder_auto"), value: "auto" as const },
            { label: t("form_builder_full"), value: "full" as const },
          ]}
          onChange={(v) => onChange({ width: v })}
        />
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function FieldSettingsPanel({
  field,
  selectedIndex,
  formConfig,
  onUpdate,
  onUpdateUIConfig,
  onUpdateFormConfig,
  onDelete,
  onDuplicate,
}: FieldSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("field");
  const { t } = useLocale();

  const TABS: { key: PanelTab; label: string }[] = [
    { key: "field", label: t("form_builder_tab_field") },
    { key: "header", label: t("form_builder_tab_header") },
    { key: "style", label: t("form_builder_tab_style") },
    { key: "submit", label: t("submit") },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="border-b border-default flex-shrink-0">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-[11px] font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-default"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {activeTab === "field" && (
          <FieldTab
            field={field}
            onUpdate={onUpdate}
            onUpdateUIConfig={onUpdateUIConfig}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        )}
        {activeTab === "header" && (
          <HeaderTab
            config={formConfig.header}
            onChange={(u) =>
              onUpdateFormConfig({ header: { ...formConfig.header, ...u } })
            }
          />
        )}
        {activeTab === "style" && (
          <StyleTab
            config={formConfig.style}
            onChange={(u) =>
              onUpdateFormConfig({ style: { ...formConfig.style, ...u } })
            }
          />
        )}
        {activeTab === "submit" && (
          <SubmitTab
            config={formConfig.submitButton}
            onChange={(u) =>
              onUpdateFormConfig({
                submitButton: { ...formConfig.submitButton, ...u },
              })
            }
          />
        )}
      </div>
    </div>
  );
}
