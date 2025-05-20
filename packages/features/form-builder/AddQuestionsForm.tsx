import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { RhfFormField } from "form-builder/FormBuilder";
import { useState, useMemo, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { ZodError } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Editor } from "@calcom/ui/components/editor";
import {
  Switch,
  CheckboxField,
  SelectField,
  Input,
  InputField,
  Label,
  BooleanToggleGroupField,
} from "@calcom/ui/components/form";

import { fieldTypesConfigMap } from "./fieldTypes";
import { excludeOrRequireEmailSchema } from "./schema";
import { getFieldIdentifier } from "./utils/getFieldIdentifier";
import { getConfig as getVariantsConfig } from "./utils/variantsConfig";

const withNamespace = (fieldNameSpace: string, field: string) => {
  return fieldNameSpace ? `${fieldNameSpace}.${field}` : field;
};

export function AddQuestionsForm({
  fieldForm,
  shouldConsiderRequired,
  fieldNameSpace = "",
}: {
  fieldForm: UseFormReturn<RhfFormField>;
  shouldConsiderRequired?: (field: RhfFormField) => boolean | undefined;
  fieldNameSpace?: string;
}) {
  const { t } = useLocale();

  const formFieldType = useMemo(
    () => fieldForm.getValues(withNamespace(fieldNameSpace, "type")),
    [fieldForm, fieldNameSpace]
  );

  const fieldType = getCurrentFieldType(fieldForm, fieldNameSpace);

  const variantsConfig = fieldForm.watch(withNamespace(fieldNameSpace, "variantsConfig"));

  const fieldTypes = useMemo(() => Object.values(fieldTypesConfigMap), []);

  useEffect(() => {
    if (!formFieldType) {
      return;
    }

    const variantsConfig = getVariantsConfig({
      type: formFieldType,
      variantsConfig: fieldForm.getValues(withNamespace(fieldNameSpace, "variantsConfig")),
    });

    // We need to set the variantsConfig in the RHF instead of using a derived value because RHF won't have the variantConfig for the variant that's not rendered yet.
    fieldForm.setValue(withNamespace(fieldNameSpace, "variantsConfig"), variantsConfig);
  }, [fieldForm]);

  return (
    <>
      <SelectField
        defaultValue={fieldTypesConfigMap.text}
        data-testid="test-field-type"
        id="test-field-type"
        isDisabled={
          fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) === "system" ||
          fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) === "system-but-optional"
        }
        onChange={(e) => {
          const value = e?.value;
          if (!value) {
            return;
          }
          fieldForm.setValue(withNamespace(fieldNameSpace, "type"), value, { shouldDirty: true });
        }}
        value={fieldTypesConfigMap[formFieldType]}
        options={fieldTypes.filter((f) => !f.systemOnly)}
        label={t("input_type")}
      />
      {(() => {
        if (!variantsConfig) {
          return (
            <>
              <InputField
                required
                {...fieldForm.register(withNamespace(fieldNameSpace, "name"))}
                containerClassName="mt-6"
                onChange={(e) => {
                  fieldForm.setValue(
                    withNamespace(fieldNameSpace, "name"),
                    getFieldIdentifier(e.target.value || ""),
                    {
                      shouldDirty: true,
                    }
                  );
                }}
                disabled={
                  fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) === "system" ||
                  fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) === "system-but-optional"
                }
                label={t("identifier")}
              />
              <CheckboxField
                description={t("disable_input_if_prefilled")}
                {...fieldForm.register(withNamespace(fieldNameSpace, "disableOnPrefill"), {
                  setValueAs: Boolean,
                })}
              />
              <div>
                {formFieldType === "boolean" ? (
                  <CheckboxFieldLabel fieldForm={fieldForm} fieldNameSpace={fieldNameSpace} />
                ) : (
                  <InputField
                    {...fieldForm.register(withNamespace(fieldNameSpace, "label"))}
                    // System fields have a defaultLabel, so there a label is not required
                    required={
                      !["system", "system-but-optional"].includes(
                        fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) || ""
                      )
                    }
                    placeholder={t(fieldForm.getValues(withNamespace(fieldNameSpace, "defaultLabel")) || "")}
                    containerClassName="mt-6"
                    label={t("label")}
                  />
                )}
              </div>

              {fieldType?.isTextType ? (
                <InputField
                  {...fieldForm.register(withNamespace(fieldNameSpace, "placeholder"))}
                  containerClassName="mt-6"
                  label={t("placeholder")}
                  placeholder={t(
                    fieldForm.getValues(withNamespace(fieldNameSpace, "defaultPlaceholder")) || ""
                  )}
                />
              ) : null}
              {fieldType?.needsOptions &&
              !fieldForm.getValues(withNamespace(fieldNameSpace, "getOptionsAt")) ? (
                <Controller
                  name={withNamespace(fieldNameSpace, "options")}
                  render={({ field: { value, onChange } }) => {
                    return <Options onChange={onChange} value={value} className="mt-6" />;
                  }}
                />
              ) : null}

              {!!fieldType?.supportsLengthCheck ? (
                <FieldWithLengthCheckSupport
                  containerClassName="mt-6"
                  fieldForm={fieldForm}
                  fieldNameSpace={fieldNameSpace}
                />
              ) : null}

              {formFieldType === "email" && (
                <InputField
                  {...fieldForm.register(withNamespace(fieldNameSpace, "requireEmails"))}
                  containerClassName="mt-6"
                  onChange={(e) => {
                    try {
                      excludeOrRequireEmailSchema.parse(e.target.value);
                      fieldForm.clearErrors(withNamespace(fieldNameSpace, "requireEmails"));
                    } catch (err) {
                      if (err instanceof ZodError) {
                        fieldForm.setError(withNamespace(fieldNameSpace, "requireEmails"), {
                          message: err.errors[0]?.message || "Invalid input",
                        });
                      }
                    }
                  }}
                  label={t("require_emails_that_contain")}
                  placeholder="gmail.com, hotmail.com, ..."
                />
              )}

              {formFieldType === "email" && (
                <InputField
                  {...fieldForm.register(withNamespace(fieldNameSpace, "excludeEmails"))}
                  containerClassName="mt-6"
                  onChange={(e) => {
                    try {
                      excludeOrRequireEmailSchema.parse(e.target.value);
                      fieldForm.clearErrors(withNamespace(fieldNameSpace, "excludeEmails"));
                    } catch (err) {
                      if (err instanceof ZodError) {
                        fieldForm.setError(withNamespace(fieldNameSpace, "excludeEmails"), {
                          message: err.errors[0]?.message || "Invalid input",
                        });
                      }
                    }
                  }}
                  label={t("exclude_emails_that_contain")}
                  placeholder="gmail.com, hotmail.com, ..."
                />
              )}

              <Controller
                name={withNamespace(fieldNameSpace, "required")}
                control={fieldForm.control}
                render={({ field: { value, onChange } }) => {
                  const isRequired = shouldConsiderRequired
                    ? shouldConsiderRequired(fieldForm.getValues())
                    : value;
                  return (
                    <BooleanToggleGroupField
                      data-testid="field-required"
                      disabled={fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) === "system"}
                      value={isRequired}
                      onValueChange={(val) => {
                        onChange(val);
                      }}
                      label={t("required")}
                    />
                  );
                }}
              />
            </>
          );
        }

        if (!fieldType.isTextType) {
          throw new Error("Variants are currently supported only with text type");
        }

        return (
          <VariantFields
            variantsConfig={variantsConfig}
            fieldForm={fieldForm}
            fieldNameSpace={fieldNameSpace}
          />
        );
      })()}
    </>
  );
}

function getCurrentFieldType(fieldForm: UseFormReturn<RhfFormField>, fieldNameSpace?: string) {
  return fieldTypesConfigMap[fieldForm.watch(withNamespace(fieldNameSpace, "type")) || "text"];
}

const CheckboxFieldLabel = ({
  fieldForm,
  fieldNameSpace,
}: {
  fieldForm: UseFormReturn<RhfFormField>;
  fieldNameSpace?: string;
}) => {
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);
  return (
    <div className="mt-6">
      <Label>{t("label")}</Label>
      <Editor
        getText={() => md.render(fieldForm.getValues(withNamespace(fieldNameSpace, "label")) || "")}
        setText={(value: string) => {
          fieldForm.setValue(withNamespace(fieldNameSpace, "label"), turndown(value), { shouldDirty: true });
        }}
        excludedToolbarItems={["blockType", "bold", "italic"]}
        disableLists
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        placeholder={t(fieldForm.getValues(withNamespace(fieldNameSpace, "defaultLabel")) || "")}
      />
    </div>
  );
};

function Options({
  label = "Options",
  value,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange = () => {},
  className = "",
  readOnly = false,
}: {
  label?: string;
  value: { label: string; value: string }[];
  onChange?: (value: { label: string; value: string }[]) => void;
  className?: string;
  readOnly?: boolean;
}) {
  const [animationRef] = useAutoAnimate<HTMLUListElement>();
  if (!value) {
    onChange([
      {
        label: "Option 1",
        value: "Option 1",
      },
      {
        label: "Option 2",
        value: "Option 2",
      },
    ]);
  }
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="bg-muted rounded-md p-4">
        <ul ref={animationRef} className="flex flex-col gap-1">
          {value?.map((option, index) => (
            <li key={index}>
              <div className="flex items-center">
                <Input
                  required
                  value={option.label}
                  onChange={(e) => {
                    // Right now we use label of the option as the value of the option. It allows us to not separately lookup the optionId to know the optionValue
                    // It has the same drawback that if the label is changed, the value of the option will change. It is not a big deal for now.
                    value.splice(index, 1, {
                      label: e.target.value,
                      value: e.target.value.trim(),
                    });
                    onChange(value);
                  }}
                  readOnly={readOnly}
                  placeholder={`Enter Option ${index + 1}`}
                />
                {value.length > 2 && !readOnly && (
                  <Button
                    type="button"
                    className="-ml-8 mb-2 hover:!bg-transparent focus:!bg-transparent focus:!outline-none focus:!ring-0"
                    size="sm"
                    color="minimal"
                    StartIcon="x"
                    onClick={() => {
                      if (!value) {
                        return;
                      }
                      const newOptions = [...value];
                      newOptions.splice(index, 1);
                      onChange(newOptions);
                    }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
        {!readOnly && (
          <Button
            color="minimal"
            onClick={() => {
              value.push({ label: "", value: "" });
              onChange(value);
            }}
            StartIcon="plus">
            Add an Option
          </Button>
        )}
      </div>
    </div>
  );
}

function VariantSelector() {
  // Implement a Variant selector for cases when there are more than 2 variants
  return null;
}

function VariantFields({
  fieldForm,
  variantsConfig,
  fieldNameSpace,
}: {
  fieldForm: UseFormReturn<RhfFormField>;
  variantsConfig: RhfFormField["variantsConfig"];
  fieldNameSpace?: string;
}) {
  const { t } = useLocale();
  if (!variantsConfig) {
    throw new Error("VariantFields component needs variantsConfig");
  }
  const fieldTypeConfigVariantsConfig =
    fieldTypesConfigMap[fieldForm.getValues(withNamespace(fieldNameSpace, "type"))]?.variantsConfig;

  if (!fieldTypeConfigVariantsConfig) {
    throw new Error("Configuration Issue: FieldType doesn't have `variantsConfig`");
  }

  const variantToggleLabel = t(fieldTypeConfigVariantsConfig.toggleLabel || "");

  const defaultVariant = fieldTypeConfigVariantsConfig.defaultVariant;

  const variantNames = Object.keys(variantsConfig.variants);
  const otherVariants = variantNames.filter((v) => v !== defaultVariant);
  if (otherVariants.length > 1 && variantToggleLabel) {
    throw new Error("More than one other variant. Remove toggleLabel ");
  }
  const otherVariant = otherVariants[0];
  const variantName = fieldForm.watch(withNamespace(fieldNameSpace, "variant")) || defaultVariant;
  const variantFields = variantsConfig.variants[variantName as keyof typeof variantsConfig].fields;
  /**
   * A variant that has just one field can be shown in a simpler way in UI.
   */
  const isSimpleVariant = variantFields.length === 1;
  const isDefaultVariant = variantName === defaultVariant;
  const supportsVariantToggle = variantNames.length === 2;
  return (
    <>
      {supportsVariantToggle ? (
        <Switch
          checked={!isDefaultVariant}
          label={variantToggleLabel}
          data-testid="variant-toggle"
          onCheckedChange={(checked) => {
            fieldForm.setValue(
              withNamespace(fieldNameSpace, "variant"),
              checked ? otherVariant : defaultVariant
            );
          }}
          classNames={{ container: "mt-2" }}
          tooltip={t("Toggle Variant")}
        />
      ) : (
        <VariantSelector />
      )}

      <InputField
        required
        {...fieldForm.register(withNamespace(fieldNameSpace, "name"))}
        containerClassName="mt-6"
        disabled={
          fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) === "system" ||
          fieldForm.getValues(withNamespace(fieldNameSpace, "editable")) === "system-but-optional"
        }
        label={t("identifier")}
      />

      <CheckboxField
        description={t("disable_input_if_prefilled")}
        {...fieldForm.register(withNamespace(fieldNameSpace, "disableOnPrefill"), { setValueAs: Boolean })}
      />

      <ul
        className={classNames(
          !isSimpleVariant ? "border-subtle divide-subtle mt-2 divide-y rounded-md border" : ""
        )}>
        {variantFields.map((f, index) => {
          const rhfVariantFieldPrefix = `variantsConfig.variants.${variantName}.fields.${index}` as const;
          const fieldTypeConfigVariants =
            fieldTypeConfigVariantsConfig.variants[
              variantName as keyof typeof fieldTypeConfigVariantsConfig.variants
            ];
          const appUiFieldConfig =
            fieldTypeConfigVariants.fieldsMap[f.name as keyof typeof fieldTypeConfigVariants.fieldsMap];
          return (
            <li className={classNames(!isSimpleVariant ? "p-4" : "")} key={f.name}>
              {!isSimpleVariant && (
                <Label className="flex justify-between">
                  <span>{`Field ${index + 1}`}</span>
                  <span className="text-muted">{f.name}</span>
                </Label>
              )}
              <InputField
                {...fieldForm.register(withNamespace(fieldNameSpace, `${rhfVariantFieldPrefix}.label`))}
                value={f.label || ""}
                placeholder={t(appUiFieldConfig?.defaultLabel || "")}
                containerClassName="mt-6"
                label={t("label")}
              />
              <InputField
                {...fieldForm.register(withNamespace(fieldNameSpace, `${rhfVariantFieldPrefix}.placeholder`))}
                key={f.name}
                value={f.placeholder || ""}
                containerClassName="mt-6"
                label={t("placeholder")}
                placeholder={t(appUiFieldConfig?.defaultPlaceholder || "")}
              />

              <Controller
                name={withNamespace(fieldNameSpace, `${rhfVariantFieldPrefix}.required`)}
                control={fieldForm.control}
                render={({ field: { onChange } }) => {
                  return (
                    <BooleanToggleGroupField
                      data-testid="field-required"
                      disabled={!appUiFieldConfig?.canChangeRequirability}
                      value={f.required}
                      onValueChange={(val) => {
                        onChange(val);
                      }}
                      label={t("required")}
                    />
                  );
                }}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

function FieldWithLengthCheckSupport({
  fieldForm,
  containerClassName = "",
  className,
  fieldNameSpace,
  ...rest
}: {
  fieldForm: UseFormReturn<RhfFormField>;
  containerClassName?: string;
  fieldNameSpace?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { t } = useLocale();
  const fieldType = getCurrentFieldType(fieldForm, fieldNameSpace);
  if (!fieldType.supportsLengthCheck) {
    return null;
  }
  const supportsLengthCheck = fieldType.supportsLengthCheck;
  const maxAllowedMaxLength = supportsLengthCheck.maxLength;

  return (
    <div className={classNames("grid grid-cols-2 gap-4", className)} {...rest}>
      <InputField
        {...fieldForm.register(withNamespace(fieldNameSpace, "minLength"), {
          valueAsNumber: true,
        })}
        defaultValue={0}
        containerClassName={containerClassName}
        label={t("min_characters")}
        type="number"
        onChange={(e) => {
          fieldForm.setValue(withNamespace(fieldNameSpace, "minLength"), parseInt(e.target.value ?? 0));
          // Ensure that maxLength field adjusts its restrictions
          fieldForm.trigger(withNamespace(fieldNameSpace, "maxLength"));
        }}
        min={0}
        max={fieldForm.getValues(withNamespace(fieldNameSpace, "maxLength")) || maxAllowedMaxLength}
      />
      <InputField
        {...fieldForm.register(withNamespace(fieldNameSpace, "maxLength"), {
          valueAsNumber: true,
        })}
        defaultValue={maxAllowedMaxLength}
        containerClassName={containerClassName}
        label={t("max_characters")}
        type="number"
        onChange={(e) => {
          if (!supportsLengthCheck) {
            return;
          }
          fieldForm.setValue(
            withNamespace(fieldNameSpace, "maxLength"),
            parseInt(e.target.value ?? maxAllowedMaxLength)
          );
          // Ensure that minLength field adjusts its restrictions
          fieldForm.trigger(withNamespace(fieldNameSpace, "minLength"));
        }}
        min={fieldForm.getValues(withNamespace(fieldNameSpace, "minLength")) || 0}
        max={maxAllowedMaxLength}
      />
    </div>
  );
}
