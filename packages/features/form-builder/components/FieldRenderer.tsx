/**
 * FieldRenderer.tsx
 *
 * Renders a non-interactive preview of a field inside FormCanvas.
 * Maps BuilderField.type → appropriate HTML preview element.
 * Supports both "default" (bordered inputs) and "underline" field styles.
 */
import React from "react";
import type { BuilderField, UIFieldConfig } from "./builderTypes";
import { toUIOptions } from "./builderTypes";
import { TextField, inputStyles } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { SelectWithValidation, Checkbox, DatePicker } from "@calcom/ui/components/form";
import { RadioGroup, RadioField } from "@calcom/ui/components/radio";
import { cn } from "@calid/features/lib/cn";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import CalendarFieldController from "@calcom/app-store/routing-forms/components/CalendarFieldController";
import type { Field as RoutingFormField } from "@calcom/app-store/routing-forms/types/types";

type FieldStyle = "default" | "underline";

interface FieldRendererProps {
  field: BuilderField;
  fieldStyle?: FieldStyle;
  accentColor?: string;
  secondaryColor?: string;
}

export function FieldRenderer({
  field,
  fieldStyle = "default",
  accentColor,
  secondaryColor,
}: FieldRendererProps) {
  const { t } = useLocale();
  const isUnderline = fieldStyle === "underline";
  const options = toUIOptions(field.options);
  const placeholder =
    field.placeholder || t("form_builder_enter_field_type", { fieldType: field.type });
  const uiConfig: UIFieldConfig = field.uiConfig ?? {};
  const legacyHideLabel = (uiConfig as { hideLabel?: boolean }).hideLabel;
  const labelText = legacyHideLabel ? "" : field.label.trim();
  const hideLabel = labelText.length === 0;
  const layoutContent = uiConfig.content ?? field.label;
  const inputVariant = isUnderline ? "underline" : "default";
  const inputSize = "md";
  const underlineStyle =
    isUnderline && secondaryColor ? ({ borderBottomColor: secondaryColor } as const) : undefined;
  const underlineSelectStyles =
    isUnderline && secondaryColor
      ? {
          control: (base: any) => ({
            ...base,
            borderBottomColor: secondaryColor,
            borderColor: secondaryColor,
          }),
        }
      : undefined;
  const dateButtonClassName = cn(
    inputStyles({ size: inputSize, variant: inputVariant }),
    "w-full justify-between text-left font-normal",
    isUnderline && [
      "bg-transparent",
      "hover:bg-transparent",
      "active:bg-transparent",
      "px-0",
      "rounded-none",
      "focus-visible:ring-0",
      "focus-visible:shadow-none",
      "hover:shadow-none",
      "active:shadow-none",
    ]
  );

  switch (field.type) {
    // ── Text-like inputs ──────────────────────────────────────────────────────
    case "text":
    case "number":
    case "url":
    case "address": {
      const inputType =
        field.type === "number" ? "number" : field.type === "url" ? "url" : "text";
      return (
        <TextField
          type={inputType}
          disabled
          placeholder={placeholder}
          variant={inputVariant}
          size={inputSize}
          style={underlineStyle}
        />
      );
    }

    case "email":
    case "multiemail":
      return (
        <TextField
          type="email"
          disabled
          placeholder={placeholder}
          variant={inputVariant}
          size={inputSize}
          style={underlineStyle}
        />
      );

    case "phone":
      return (
        <TextField
          type="tel"
          disabled
          placeholder={placeholder}
          variant={inputVariant}
          size={inputSize}
          style={underlineStyle}
        />
      );

    case "textarea":
      return (
        <TextArea
          disabled
          placeholder={placeholder}
          rows={3}
          variant={inputVariant}
          size={inputSize}
          style={underlineStyle}
        />
      );

    // ── Date / Time ───────────────────────────────────────────────────────────
    case "date":
      return (
        <DatePicker
          date={null as unknown as Date}
          disabled
          className="w-full"
          buttonClassName={dateButtonClassName}
          buttonStyle={underlineStyle}
          placeholder={field.placeholder || t("form_builder_pick_a_date")}
          variant={uiConfig.datePickerVariant ?? "default"}
        />
      );

    case "time":
      return (
        <TextField
          type="time"
          disabled
          variant={inputVariant}
          size={inputSize}
          style={underlineStyle}
        />
      );

    case "calendar":
      return (
        <CalendarFieldController
          field={field as unknown as RoutingFormField}
          value=""
          onChange={() => {}}
          eventType={null}
          formContext={{}}
          disabled
          fieldStyle={fieldStyle}
          accentColor={accentColor}
          secondaryColor={secondaryColor}
        />
      );

    // ── Selection ─────────────────────────────────────────────────────────────
    case "select":
      return (
        <SelectWithValidation
          aria-label="select-dropdown"
          isDisabled={true}
          placeholder={field.placeholder || t("select")}
          options={options.map((o) => ({ label: o, value: o }))}
          value={null}
          variant={inputVariant}
          size={inputSize}
          styles={underlineSelectStyles}
        />
      );

    case "multiselect":
      return (
        <SelectWithValidation
          aria-label="multi-select-dropdown"
          isDisabled={true}
          isMulti={true}
          placeholder={field.placeholder || t("select")}
          options={options.map((o) => ({ label: o, value: o }))}
          value={[]}
          variant={inputVariant}
          size={inputSize}
          styles={underlineSelectStyles}
        />
      );

    case "radio":
      return (
        <RadioGroup disabled value="">
          <div
            className={
              uiConfig.radioDirection === "row"
                ? "flex flex-wrap gap-x-5 gap-y-2"
                : "space-y-2"
            }
          >
            {options.map((o, i) => (
              <RadioField
                key={i}
                id={`${field.id}-radio-${i}`}
                label={o}
                value={o}
                variant={uiConfig.radioVariant ?? "default"}
              />
            ))}
          </div>
        </RadioGroup>
      );

    case "checkbox": {
      const dir = uiConfig.checkboxDirection ?? "column";
      const variant = uiConfig.checkboxVariant ?? "default";
      return (
        <div className={dir === "row" ? "flex flex-wrap gap-x-5 gap-y-2" : "space-y-2"}>
          {options.map((o, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={false}
                disabled
                variant={variant}
                style={secondaryColor ? { borderColor: secondaryColor } : undefined}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }

    case "boolean": {
      const variant = uiConfig.checkboxVariant ?? "default";
      return (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={false}
            disabled
            variant={variant}
            style={secondaryColor ? { borderColor: secondaryColor } : undefined}
          />
          {!hideLabel && (
            <span className="text-muted-foreground">
              {labelText || t("confirm")}
            </span>
          )}
        </label>
      );
    }

    // ── Layout-only ───────────────────────────────────────────────────────────
    case "divider":
      return <hr className="border-border my-1" />;

    case "heading":
      return (
        <h3 className="text-base font-semibold text-foreground">
          {layoutContent || t("form_builder_heading")}
        </h3>
      );

    case "paragraph":
      return (
        <p className="text-sm text-muted-foreground">
          {layoutContent || t("form_builder_paragraph_text")}
        </p>
      );

    default:
      return (
        <div className="rounded border border-dashed border-border p-2 text-xs text-muted-foreground">
          {t("form_builder_unknown_field_type", { fieldType: field.type })}
        </div>
      );
  }
}
