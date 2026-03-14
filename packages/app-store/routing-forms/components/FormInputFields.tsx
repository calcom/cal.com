import type { App_RoutingForms_Form } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Checkbox, DatePicker } from "@calcom/ui/components/form";
import { RadioGroup, RadioField } from "@calcom/ui/components/radio";
import { TextField, inputStyles } from "@calid/features/ui/components/input/input";
import { cn } from "@calid/features/lib/cn";
import { format } from "date-fns";

import type { FormLevelConfig } from "@calcom/features/form-builder/components/builderTypes";
import { LAYOUT_ONLY_TYPES } from "@calcom/features/form-builder/components/builderTypes";

import getFieldIdentifier from "../lib/getFieldIdentifier";
import { getQueryBuilderConfigForFormFields } from "../lib/getQueryBuilderConfig";
import isRouterLinkedField from "../lib/isRouterLinkedField";
import { getUIOptionsForSelect } from "../lib/selectOptions";
import { getFieldResponseForJsonLogic, getOptionIdForValue } from "../lib/transformResponse";
import type { SerializableForm, FormResponse } from "../types/types";
import { ConfigFor, withRaqbSettingsAndWidgets } from "./react-awesome-query-builder/config/uiConfig";
import CalendarFieldController from "./CalendarFieldController";

const emailRegex = /^\S+@\S+\.\S+$/;
const phoneRegex = /^\+?[0-9\s\-()]{7,}$/;

const isEmptyValue = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const getValidationErrorMessage = (field: any, value: unknown) => {
  const validation = field.uiConfig?.validation;
  const minChars = typeof validation?.minChars === "number" ? validation.minChars : null;
  const labelOrPlaceholder =
    field.label.trim() || field.placeholder?.trim() || field.identifier?.trim() || "value";
  const requiredMessage = `Please enter ${labelOrPlaceholder}`;

  if (field.required && isEmptyValue(value)) {
    return requiredMessage;
  }

  if (!isEmptyValue(value)) {
    if (field.type === "email" && !emailRegex.test(String(value))) {
      return "Please enter valid email address";
    }
    if (field.type === "phone" && !phoneRegex.test(String(value))) {
      return "Please enter valid phone number";
    }
    if (field.type === "textarea" && minChars) {
      const length = String(value).trim().length;
      if (length < minChars) {
        return `Please enter at least ${minChars} characters`;
      }
    }
  }

  return null;
};

export type FormInputFieldsProps = {
  form: Pick<SerializableForm<App_RoutingForms_Form>, "fields">;
  /**
   * Make sure that response is updated by setResponse
   */
  response: FormResponse;
  setResponse: Dispatch<SetStateAction<FormResponse>>;
  /**
   * Identifier of the fields that should be disabled
   */
  disabledFields?: string[];
  fieldStyle?: FormLevelConfig["style"]["fieldStyle"];
  showErrors?: boolean;
  accentColor?: string;
  secondaryColor?: string;
  calendarEventType?: string | null;
  calendarFormContext?: { username?: string | null; teamSlug?: string | null };
  onFieldChange?: (args: {
    field: SerializableForm<App_RoutingForms_Form>["fields"][number];
    value: number | string | string[];
    nextResponse: FormResponse;
  }) => void;
};

export default function FormInputFields(props: FormInputFieldsProps) {
  const {
    form,
    response,
    setResponse,
    disabledFields = [],
    fieldStyle = "default",
    showErrors = false,
    accentColor,
    secondaryColor,
    calendarEventType,
    calendarFormContext,
    onFieldChange,
  } = props;
  const checkboxAccentClass = "data-[state=checked]:bg-transparent";
  const checkboxStyle = {
    ...(accentColor ? { color: accentColor } : {}),
    ...(secondaryColor ? { borderColor: secondaryColor } : {}),
  };
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const formFieldsQueryBuilderConfig = withRaqbSettingsAndWidgets({
    config: getQueryBuilderConfigForFormFields(form),
    configFor: ConfigFor.FormFields,
  });

  const isUnderline = fieldStyle === "underline";
  const labelClassName = isUnderline
    ? "mb-0.5 block text-xs font-medium text-default"
    : "mb-1.5 block text-sm font-medium text-default";

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

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {form.fields?.map((field) => {
        if (isRouterLinkedField(field)) {
          // @ts-expect-error FIXME @hariombalhara
          const routerField = field.routerField;
          // A field that has been deleted from the main form would still be there in the duplicate form but disconnected
          // In that case, it could mistakenly be categorized as RouterLinkedField, so if routerField is nullish, we use the field itself
          field = routerField ?? field;
        }

        const isLayout = LAYOUT_ONLY_TYPES.has(field.type);
        const isCalendar = field.type === "calendar";
        const isFull = isLayout || isCalendar || (field.uiConfig?.layout ?? "full") === "full";
        const fieldIdentifier = getFieldIdentifier(field);
        const legacyHideLabel = (field.uiConfig as { hideLabel?: boolean } | undefined)?.hideLabel;
        const labelText = legacyHideLabel ? "" : field.label.trim();
        const hideLabel = labelText.length === 0;
        const currentValue = response[field.id]?.value ?? "";
        const errorMessage = getValidationErrorMessage(field, currentValue);
        const showError = showErrors || (field.required && touched[field.id]);
        const isDisabled = disabledFields?.includes(fieldIdentifier);

        if (isLayout) {
          const layoutContent = field.uiConfig?.content ?? field.label;
          return (
            <div
              key={field.id}
              className={isFull ? "col-span-1 sm:col-span-2" : "col-span-1"}
            >
              <div className="rounded-lg border-2 border-transparent p-3">
                {field.type === "divider" && <hr className="border-border my-1" />}
                {field.type === "heading" && (
                  <h3 className="text-base font-semibold text-foreground">
                    {layoutContent || "Heading"}
                  </h3>
                )}
                {field.type === "paragraph" && (
                  <p className="text-sm text-muted-foreground">
                    {layoutContent || "Paragraph text"}
                  </p>
                )}
              </div>
            </div>
          );
        }

        const updateResponse = (value: number | string | string[]) => {
          setResponse((prev) => {
            const optionId = getOptionIdForValue({ field, value });
            const next: FormResponse = {
              ...prev,
              [field.id]: {
                label: field.label,
                identifier: field?.identifier,
                value: getFieldResponseForJsonLogic({ field, value }),
                ...(optionId !== undefined ? { optionId } : {}),
              },
            };
            onFieldChange?.({ field, value, nextResponse: next });
            return next;
          });
        };

        const renderCustomField = () => {
          if (field.type === "url") {
            return (
              <TextField
                type="url"
                value={String(currentValue)}
                placeholder={field.placeholder ?? ""}
                disabled={isDisabled}
                variant={inputVariant}
                size={inputSize}
                style={underlineStyle}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                onChange={(e) => updateResponse(e.target.value)}
              />
            );
          }

          if (field.type === "address") {
            return (
              <TextField
                type="text"
                value={String(currentValue)}
                placeholder={field.placeholder ?? ""}
                disabled={isDisabled}
                variant={inputVariant}
                size={inputSize}
                style={underlineStyle}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                onChange={(e) => updateResponse(e.target.value)}
              />
            );
          }

          if (field.type === "radio") {
            const options = getUIOptionsForSelect(field);
            const radioVariant = field.uiConfig?.radioVariant ?? "default";
            return (
              <RadioGroup
                disabled={isDisabled}
                value={String(currentValue)}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                onValueChange={(val) => updateResponse(val)}
              >
                <div
                  className={
                    field.uiConfig?.radioDirection === "row"
                      ? "flex flex-wrap gap-x-5 gap-y-2"
                      : "space-y-2"
                  }
                >
                  {options.map((o, i) => (
                    <RadioField
                      key={i}
                      id={`${field.id}-radio-${i}`}
                      label={o.title}
                      value={String(o.value)}
                      accentColor={accentColor}
                      variant={radioVariant}
                    />
                  ))}
                </div>
              </RadioGroup>
            );
          }

          if (field.type === "checkbox") {
            const options = getUIOptionsForSelect(field);
            const selected =
              Array.isArray(currentValue) ? currentValue.map(String) : [];
            const checkboxVariant = field.uiConfig?.checkboxVariant ?? "default";
            return (
              <div
                className={
                  field.uiConfig?.checkboxDirection === "row"
                    ? "flex flex-wrap gap-x-5 gap-y-2"
                    : "space-y-2"
                }
              >
                {options.map((o, i) => {
                  const value = String(o.value);
                  const checked = selected.includes(value);
                  return (
                    <label key={i} className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        disabled={isDisabled}
                        checked={checked}
                        variant={checkboxVariant}
                        className={checkboxAccentClass}
                        style={checkboxStyle}
                        onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                        onCheckedChange={(next) => {
                          const nextSelected = checked
                            ? selected.filter((v) => v !== value)
                            : [...selected, value];
                          updateResponse(nextSelected);
                        }}
                      />
                      {o.title}
                    </label>
                  );
                })}
              </div>
            );
          }

          if (field.type === "boolean") {
            const checked = String(currentValue) === "true";
            const checkboxVariant = field.uiConfig?.checkboxVariant ?? "default";
            return (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  disabled={isDisabled}
                  checked={checked}
                  variant={checkboxVariant}
                  className={checkboxAccentClass}
                  style={checkboxStyle}
                  onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                  onCheckedChange={(next) => updateResponse(next ? "true" : "")}
                />
                {!hideLabel && <span className="text-muted-foreground">{labelText}</span>}
              </label>
            );
          }

          if (field.type === "date") {
            const rawDate = currentValue ? String(currentValue) : "";
            const parsedDate = rawDate ? new Date(rawDate) : null;
            const dateValue =
              parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
            return (
              <DatePicker
                date={dateValue as Date}
                disabled={isDisabled}
                className="w-full"
                buttonClassName={dateButtonClassName}
                buttonStyle={underlineStyle}
                placeholder={field.placeholder || "Pick a date"}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                variant={field.uiConfig?.datePickerVariant ?? "default"}
                accentColor={accentColor}
                onDatesChange={(nextDate) => {
                  updateResponse(format(nextDate, "yyyy-MM-dd"));
                }}
              />
            );
          }

          if (field.type === "time") {
            return (
              <TextField
                type="time"
                value={String(currentValue)}
                disabled={isDisabled}
                variant={inputVariant}
                size={inputSize}
                style={underlineStyle}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                onChange={(e) => updateResponse(e.target.value)}
              />
            );
          }

          if (field.type === "calendar") {
            return (
              <CalendarFieldController
                field={field}
                value={currentValue}
                onChange={(slot) => updateResponse(slot)}
                eventType={calendarEventType ?? null}
                formContext={calendarFormContext ?? {}}
                disabled={isDisabled}
                fieldStyle={fieldStyle}
                accentColor={accentColor}
                secondaryColor={secondaryColor}
              />
            );
          }

          return null;
        };

        const customField = renderCustomField();
        if (customField) {
          return (
            <div
              key={field.id}
              className={isFull ? "col-span-1 sm:col-span-2" : "col-span-1"}
            >
              <div className="rounded-lg border-2 border-transparent p-3">
                {!hideLabel && (
                  <label
                    id={`field-label-${field.id}`}
                    className={labelClassName}
                  >
                    {labelText}
                    {field.required && <span className="ml-0.5 text-error">*</span>}
                  </label>
                )}
                {customField}
                {field.uiConfig?.helpText && (
                  <p className="mt-1.5 text-xs text-muted">{field.uiConfig.helpText}</p>
                )}
                {showError && errorMessage && (
                  <p className="mt-1.5 text-xs text-error">{errorMessage}</p>
                )}
              </div>
            </div>
          );
        }

        const widget = formFieldsQueryBuilderConfig.widgets[field.type];
        if (!widget || !("factory" in widget)) {
          return null;
        }
        const Component = widget.factory;
        const options = getUIOptionsForSelect(field);
        const widgetPlaceholder =
          field.placeholder ??
          (widget as {
            valuePlaceholder?: string;
          }).valuePlaceholder ??
          "";

        return (
          <div
            key={field.id}
            className={isFull ? "col-span-1 sm:col-span-2" : "col-span-1"}
          >
            <div className="rounded-lg border-2 border-transparent p-3">
              {!hideLabel && (
                <label
                  id={`field-label-${field.id}`}
                  className={labelClassName}
                >
                  {labelText}
                  {field.required && <span className="ml-0.5 text-error">*</span>}
                </label>
              )}
              <Component
                value={currentValue}
                placeholder={widgetPlaceholder}
                variant={inputVariant}
                size={inputSize}
                styles={underlineSelectStyles}
                style={underlineStyle}
                // required property isn't accepted by query-builder types
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                /* @ts-ignore */
                required={!!field.required}
                listValues={options}
                disabled={isDisabled}
                data-testid={`form-field-${fieldIdentifier}`}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                setValue={(value: number | string | string[]) => {
                  updateResponse(value);
                }}
              />
              {field.uiConfig?.helpText && (
                <p className="mt-1.5 text-xs text-muted">{field.uiConfig.helpText}</p>
              )}
              {showError && errorMessage && (
                <p className="mt-1.5 text-xs text-error">{errorMessage}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const FormInputFieldsSkeleton = () => {
  const numberOfFields = 5;
  return (
    <>
      {Array.from({ length: numberOfFields }).map((_, index) => (
        <div key={index} className="mb-4 block flex-col sm:flex ">
          <SkeletonText className="mb-2 h-3.5 w-64" />
          <SkeletonText className="mb-2 h-9 w-32 w-full" />
        </div>
      ))}
    </>
  );
};
