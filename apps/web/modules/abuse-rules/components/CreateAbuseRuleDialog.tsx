"use client";

import { useEffect, useMemo } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import {
  ABUSE_RULE_FIELDS,
  ABUSE_RULE_OPERATORS,
  DOMAIN_FIELDS,
  NUMERIC_FIELDS,
  VELOCITY_FIELDS,
  VELOCITY_UNITS,
} from "@calcom/features/abuse-scoring/lib/constants";
import type { AbuseRuleField, AbuseRuleOperator, VelocityUnit } from "@calcom/features/abuse-scoring/lib/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import {
  Input,
  Label,
  NumberInput,
  Select,
  Switch,
} from "@calcom/ui/components/form";

type FieldOption = { label: string; value: AbuseRuleField };
type OperatorOption = { label: string; value: AbuseRuleOperator };
type VelocityUnitOption = { label: string; value: VelocityUnit };

const FIELD_LABELS: Record<AbuseRuleField, string> = {
  EVENT_TYPE_TITLE: "Event Type Title",
  EVENT_TYPE_DESCRIPTION: "Event Type Description",
  REDIRECT_URL: "Redirect URL",
  CANCELLATION_REASON: "Cancellation Reason",
  BOOKING_LOCATION: "Booking Location",
  BOOKING_RESPONSES: "Booking Responses",
  WORKFLOW_CONTENT: "Workflow Content",
  USERNAME: "Username",
  SIGNUP_EMAIL_DOMAIN: "Signup Email Domain",
  SIGNUP_NAME: "Signup Name",
  BOOKING_VELOCITY: "Booking Velocity",
  SELF_BOOKING_COUNT: "Self-Booking Count",
};

const OPERATOR_LABELS: Record<AbuseRuleOperator, string> = {
  CONTAINS: "contains",
  EXACT: "equals",
  GREATER_THAN: "greater than",
  MATCHES_DOMAIN: "domain (wildcard)",
};

const VELOCITY_UNIT_OPTIONS: VelocityUnitOption[] = VELOCITY_UNITS.map((u) => ({
  label: u === "hour" ? "/ hour" : "/ min",
  value: u,
}));

function getOperatorsForField(field: AbuseRuleField): OperatorOption[] {
  if (NUMERIC_FIELDS.has(field) || VELOCITY_FIELDS.has(field)) {
    return [{ label: OPERATOR_LABELS.GREATER_THAN, value: "GREATER_THAN" }];
  }
  const ops: OperatorOption[] = [
    { label: OPERATOR_LABELS.CONTAINS, value: "CONTAINS" },
    { label: OPERATOR_LABELS.EXACT, value: "EXACT" },
  ];
  if (DOMAIN_FIELDS.has(field)) {
    ops.push({ label: OPERATOR_LABELS.MATCHES_DOMAIN, value: "MATCHES_DOMAIN" });
  }
  return ops;
}

/**
 * Parses a compound velocity value (e.g. "50/hour") into its parts.
 * Returns defaults for empty or malformed values.
 */
function parseVelocityValue(value: string): { threshold: string; unit: VelocityUnit } {
  const idx = value.indexOf("/");
  if (idx === -1) return { threshold: value || "", unit: "hour" };
  return {
    threshold: value.slice(0, idx),
    unit: (value.slice(idx + 1) as VelocityUnit) || "hour",
  };
}

export interface CreateAbuseRuleFormData {
  description: string;
  matchAll: boolean;
  weight: number;
  autoLock: boolean;
  enabled: boolean;
  conditions: Array<{
    field: AbuseRuleField;
    operator: AbuseRuleOperator;
    value: string;
  }>;
}

export interface CreateAbuseRuleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAbuseRuleFormData) => void;
  isPending: boolean;
  defaultValues?: Partial<CreateAbuseRuleFormData>;
  title?: string;
}

const DEFAULT_CONDITION = { field: "EVENT_TYPE_TITLE" as AbuseRuleField, operator: "CONTAINS" as AbuseRuleOperator, value: "" };

export function CreateAbuseRuleDialog({
  isOpen,
  onClose,
  onSubmit,
  isPending,
  defaultValues,
  title,
}: CreateAbuseRuleDialogProps) {
  const { t } = useLocale();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateAbuseRuleFormData>({
    defaultValues: {
      description: "",
      matchAll: true,
      weight: 25,
      autoLock: false,
      enabled: true,
      conditions: [{ ...DEFAULT_CONDITION }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "conditions" });
  const watchAutoLock = watch("autoLock");

  useEffect(() => {
    if (isOpen) {
      reset({
        description: "",
        matchAll: true,
        weight: 25,
        autoLock: false,
        enabled: true,
        conditions: [{ ...DEFAULT_CONDITION }],
        ...defaultValues,
      });
    }
  }, [isOpen, reset, defaultValues]);

  const handleClose = () => {
    onClose();
    reset();
  };

  const fieldOptions = useMemo<FieldOption[]>(
    () => ABUSE_RULE_FIELDS.map((f) => ({ label: FIELD_LABELS[f], value: f })),
    []
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent enableOverflow size="md">
        <DialogHeader title={title ?? t("create_abuse_rule")} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Description */}
            <div>
              <Label className="text-emphasis mb-2 block text-sm font-medium">{t("description")}</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder={t("abuse_rule_description_placeholder")} />
                )}
              />
            </div>

            {/* Conditions */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-emphasis text-sm font-medium">{t("conditions")}</Label>
                {fields.length > 1 && (
                  <Controller
                    name="matchAll"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center gap-1.5">
                        <span className="text-subtle text-xs">{t("match")}</span>
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className="bg-subtle text-emphasis hover:bg-emphasis hover:text-inverted rounded-full px-3 py-1 text-xs font-semibold uppercase transition">
                          {field.value ? t("all_conditions") : t("any_condition")}
                        </button>
                      </div>
                    )}
                  />
                )}
              </div>

              <div className="space-y-0">
                {fields.map((condField, index) => {
                  const watchedField = watch(`conditions.${index}.field`);
                  const operatorOptions = getOperatorsForField(watchedField);
                  const isNumeric = NUMERIC_FIELDS.has(watchedField);
                  const isVelocity = VELOCITY_FIELDS.has(watchedField);

                  return (
                    <div key={condField.id}>
                      {/* AND/OR label between conditions */}
                      {index > 0 && (
                        <div className="flex items-center justify-center py-2">
                          <div className="border-subtle flex-1 border-t" />
                          <span className="text-muted mx-3 text-xs font-semibold uppercase">
                            {watch("matchAll") ? "AND" : "OR"}
                          </span>
                          <div className="border-subtle flex-1 border-t" />
                        </div>
                      )}

                      <div className="border-subtle flex items-start gap-2 rounded-lg border p-3">
                        {/* Field select */}
                        <div className="min-w-[150px]">
                          <Controller
                            name={`conditions.${index}.field`}
                            control={control}
                            render={({ field }) => (
                              <Select<FieldOption>
                                value={fieldOptions.find((o) => o.value === field.value)}
                                onChange={(option) => {
                                  if (option) {
                                    field.onChange(option.value);
                                    const newOps = getOperatorsForField(option.value);
                                    setValue(`conditions.${index}.operator`, newOps[0].value);
                                    if (VELOCITY_FIELDS.has(option.value)) {
                                      setValue(`conditions.${index}.value`, "/hour");
                                    } else {
                                      setValue(`conditions.${index}.value`, "");
                                    }
                                  }
                                }}
                                options={fieldOptions}
                                isSearchable={false}
                              />
                            )}
                          />
                        </div>

                        {/* Operator select */}
                        <div className="min-w-[130px]">
                          <Controller
                            name={`conditions.${index}.operator`}
                            control={control}
                            render={({ field }) => (
                              <Select<OperatorOption>
                                value={operatorOptions.find((o) => o.value === field.value)}
                                onChange={(option) => {
                                  if (option) field.onChange(option.value);
                                }}
                                options={operatorOptions}
                                isSearchable={false}
                              />
                            )}
                          />
                        </div>

                        {/* Value input */}
                        <div className="min-w-[120px] flex-1">
                          <Controller
                            name={`conditions.${index}.value`}
                            control={control}
                            rules={{ required: t("required") }}
                            render={({ field }) => {
                              if (isVelocity) {
                                const parsed = parseVelocityValue(field.value);
                                return (
                                  <div className="flex items-center gap-2">
                                    <NumberInput
                                      value={parsed.threshold}
                                      onChange={(e) => field.onChange(`${e.target.value}/${parsed.unit}`)}
                                      min={0}
                                      placeholder="0"
                                      className="w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <Select<VelocityUnitOption>
                                      value={VELOCITY_UNIT_OPTIONS.find((o) => o.value === parsed.unit)}
                                      onChange={(option) => {
                                        if (option) field.onChange(`${parsed.threshold}/${option.value}`);
                                      }}
                                      options={VELOCITY_UNIT_OPTIONS}
                                      isSearchable={false}
                                      className="min-w-[100px]"
                                    />
                                  </div>
                                );
                              }
                              if (isNumeric) {
                                return (
                                  <NumberInput
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    min={0}
                                    placeholder="0"
                                    className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                );
                              }
                              return <Input {...field} placeholder={t("value")} />;
                            }}
                          />
                          {errors.conditions?.[index]?.value && (
                            <p className="text-destructive mt-1 text-xs">
                              {errors.conditions[index].value?.message}
                            </p>
                          )}
                        </div>

                        {/* Remove button */}
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="icon"
                            color="destructive"
                            StartIcon="x"
                            onClick={() => remove(index)}
                            className="mt-1"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Button
                  type="button"
                  color="secondary"
                  StartIcon="plus"
                  onClick={() => append({ ...DEFAULT_CONDITION })}>
                  {t("add_condition")}
                </Button>
                <span className="text-subtle text-xs">{t("matching_is_case_insensitive")}</span>
              </div>
            </div>

            {/* Action section */}
            <div className="border-subtle rounded-lg border p-4">
              <Label className="text-emphasis mb-4 block text-sm font-medium">{t("action")}</Label>

              <div className="space-y-4">
                {/* Auto-lock toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emphasis text-sm font-medium">{t("auto_lock")}</p>
                    <p className="text-subtle text-xs">{t("auto_lock_description")}</p>
                  </div>
                  <Controller
                    name="autoLock"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                {/* Weight — hidden when autoLock is on */}
                {!watchAutoLock && (
                  <div>
                    <Label className="text-emphasis mb-2 block text-sm font-medium">
                      {t("score_contribution")}
                    </Label>
                    <Controller
                      name="weight"
                      control={control}
                      rules={{ required: true, min: 0, max: 100 }}
                      render={({ field }) => (
                        <div className="flex items-center gap-3">
                          <NumberInput
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            min={0}
                            max={100}
                            className="w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-subtle text-sm">/ 100</span>
                        </div>
                      )}
                    />
                    {errors.weight && (
                      <p className="text-destructive mt-1 text-xs">{t("weight_validation")}</p>
                    )}
                  </div>
                )}

                {/* Enabled toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emphasis text-sm font-medium">{t("enabled")}</p>
                    <p className="text-subtle text-xs">{t("rule_enabled_description")}</p>
                  </div>
                  <Controller
                    name="enabled"
                    control={control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" color="secondary" onClick={handleClose} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={isPending} disabled={isPending}>
              {title ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
