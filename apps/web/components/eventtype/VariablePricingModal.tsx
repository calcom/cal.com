import { useEffect, useState } from "react";
import type { FormValues } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { PricingRule } from "@calcom/lib/pricing/types";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Label,
  Select,
  Switch,
  TextField,
  showToast,
  Spinner,
} from "@calcom/ui";
import { Plus, Edit2, Trash2 } from "@calcom/ui/components/icon";

interface VariablePricingProps {
  eventTypeId: number;
  onClose: () => void;
}

type FormData = {
  enabled: boolean;
  basePrice: number;
  currency: string;
  rules: PricingRule[];
};

const PRICE_MODIFIER_ACTIONS = [
  { value: "add", label: t("add_fixed_amount") },
  { value: "subtract", label: t("subtract_fixed_amount") },
  { value: "multiply", label: t("multiply_percentage") },
  { value: "divide", label: t("divide_percentage") },
  { value: "set", label: t("set_fixed_price") },
];

const CONDITION_TYPES = [
  { value: "duration", label: t("duration") },
  { value: "timeOfDay", label: t("time_of_day") },
  { value: "dayOfWeek", label: t("day_of_week") },
  { value: "custom", label: t("custom_field") },
];

const COMPARISON_OPERATORS = [
  { value: "eq", label: t("equals") },
  { value: "neq", label: t("not_equals") },
  { value: "gt", label: t("greater_than") },
  { value: "gte", label: t("greater_than_or_equal") },
  { value: "lt", label: t("less_than") },
  { value: "lte", label: t("less_than_or_equal") },
  { value: "contains", label: t("contains") },
  { value: "custom", label: t("custom_function") },
];

const DAYS_OF_WEEK = [
  { value: "sunday", label: t("sunday") },
  { value: "monday", label: t("monday") },
  { value: "tuesday", label: t("tuesday") },
  { value: "wednesday", label: t("wednesday") },
  { value: "thursday", label: t("thursday") },
  { value: "friday", label: t("friday") },
  { value: "saturday", label: t("saturday") },
];

const CURRENCIES = [
  { value: "USD", label: t("currency_usd") },
  { value: "EUR", label: t("currency_eur") },
  { value: "GBP", label: t("currency_gbp") },
  { value: "CAD", label: t("currency_cad") },
  { value: "AUD", label: t("currency_aud") },
  { value: "JPY", label: t("currency_jpy") },
  { value: "INR", label: t("currency_inr") },
];

export function VariablePricingModal({ eventTypeId, onClose }: VariablePricingProps) {
  const { t } = useLocale();
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const form = useFormContext<FormValues>();

  // Fetch the pricing config
  const { data: pricingData, isLoading } = trpc.viewer.eventTypes.pricing.getPricingRules.useQuery({
    eventTypeId,
  });

  const updatePricingRulesMutation = trpc.viewer.eventTypes.pricing.updatePricingRules.useMutation({
    onSuccess: () => {
      showToast(t("variable_pricing_updated_successfully"), "success");
      onClose();
    },
    onError: (error) => {
      showToast(error.message || t("variable_pricing_update_failed"), "error");
    },
  });

  // Set form data from API response
  useEffect(() => {
    if (pricingData?.pricingConfig) {
      const config = pricingData.pricingConfig;
      form.setValue("variablePricing.enabled", config.enabled);
      form.setValue("variablePricing.basePrice", config.basePrice / 100); // Convert cents to dollars
      form.setValue("variablePricing.currency", config.currency?.toUpperCase?.() || "USD");
      form.setValue("variablePricing.rules", config.rules);
    }
  }, [pricingData, form]);

  const onSubmit = (data: FormData) => {
    // Convert dollars to cents for API
    const basePrice = Math.round(data.basePrice * 100);

    // Prepare rules for API
    updatePricingRulesMutation.mutate({
      eventTypeId,
      pricingConfig: {
        enabled: data.enabled,
        basePrice,
        currency: data.currency,
        rules: data.rules.map((rule) => {
          return {
            id: rule.id,
            type: rule.type,
            enabled: rule.enabled,
            description: rule.description,
            priority: rule.priority ?? 0,
            condition: rule.condition,
            // map UI fields to pricing model
            ...(rule.price != null
              ? { price: Math.round(rule.price) } // already cents if editing existing
              : rule.action === "set"
              ? { price: Math.round((rule.amount || 0) * 100) }
              : rule.action === "add"
              ? { priceModifier: { type: "surcharge", value: Math.round((rule.amount || 0) * 100) } }
              : rule.action === "subtract"
              ? { priceModifier: { type: "discount", value: Math.round((rule.amount || 0) * 100) } }
              : rule.action === "multiply"
              ? { priceModifier: { type: "surcharge", value: 0, percentage: rule.amount || 0 } }
              : rule.action === "divide"
              ? { priceModifier: { type: "discount", value: 0, percentage: rule.amount || 0 } }
              : {}),
          };
        }),
      },
    });
  };

  const addRule = (rule: PricingRule) => {
    const currentRules = form.getValues("variablePricing.rules") || [];

    if (editingRuleIndex !== null) {
      // Update existing rule
      const updatedRules = [...currentRules];
      updatedRules[editingRuleIndex] = rule;
      form.setValue("variablePricing.rules", updatedRules);
    } else {
      // Add new rule
      form.setValue("variablePricing.rules", [...currentRules, rule]);
    }

    setIsAddingRule(false);
    setEditingRuleIndex(null);
  };

  const deleteRule = (index: number) => {
    const currentRules = form.getValues("variablePricing.rules") || [];
    const updatedRules = currentRules.filter((_, i) => i !== index);
    form.setValue("variablePricing.rules", updatedRules);
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader title={t("variable_pricing")} subtitle={t("variable_pricing_description")} />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Controller
                name="variablePricing.enabled"
                control={form.control}
                render={({ field: { value, onChange } }) => (
                  <div className="flex items-center space-x-2">
                    <Switch checked={value} onCheckedChange={onChange} id="variable-pricing-toggle" />
                    <Label htmlFor="variable-pricing-toggle">{t("enable_variable_pricing")}</Label>
                  </div>
                )}
              />
            </div>

            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="base-price">{t("base_price")}</Label>
                  <Controller
                    name="variablePricing.basePrice"
                    control={form.control}
                    render={({ field: { value, onChange } }) => (
                      <TextField
                        id="base-price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">{t("currency")}</Label>
                  <Controller
                    name="variablePricing.currency"
                    control={form.control}
                    render={({ field: { value, onChange } }) => (
                      <Select id="currency" options={CURRENCIES} value={value} onChange={onChange} />
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium">{t("pricing_rules")}</h3>
                <Button
                  color="secondary"
                  StartIcon={Plus}
                  onClick={() => {
                    setIsAddingRule(true);
                    setEditingRuleIndex(null);
                  }}>
                  {t("add_rule")}
                </Button>
              </div>

              <div className="space-y-4">
                <Controller
                  name="variablePricing.rules"
                  control={form.control}
                  render={({ field: { value } }) => (
                    <>
                      {Array.isArray(value) && value.length > 0 ? (
                        <div className="divide-y rounded-md border">
                          {value.map((rule, index) => (
                            <div key={rule.id} className="flex items-center justify-between p-4">
                              <div>
                                <div className="mb-1 flex items-center">
                                  <span className="font-medium">
                                    {rule.description || `Rule ${index + 1}`}
                                  </span>
                                  {rule.enabled ? (
                                    <Badge className="ml-2" variant="success">
                                      {t("active")}
                                    </Badge>
                                  ) : (
                                    <Badge className="ml-2" variant="gray">
                                      {t("inactive")}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {/* Format rule description */}
                                  {rule.type === "duration"
                                    ? `Duration ${rule.condition.minDuration || 0} - ${
                                        rule.condition.maxDuration || "∞"
                                      } min`
                                    : rule.type === "timeOfDay"
                                    ? `Time between ${rule.condition.startTime || "00:00"} - ${
                                        rule.condition.endTime || "23:59"
                                      }`
                                    : rule.type === "dayOfWeek"
                                    ? `Days: ${(rule.condition.days || []).join(", ")}`
                                    : `Custom rule: ${JSON.stringify(rule.condition)}`}
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  color="minimal"
                                  size="icon"
                                  StartIcon={Edit2}
                                  onClick={() => {
                                    setEditingRuleIndex(index);
                                    setIsAddingRule(true);
                                  }}
                                />
                                <Button
                                  color="destructive"
                                  size="icon"
                                  StartIcon={Trash2}
                                  onClick={() => deleteRule(index)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed p-8 text-center">
                          <p className="text-gray-500">{t("no_pricing_rules")}</p>
                          <Button
                            color="secondary"
                            StartIcon={Plus}
                            className="mt-4"
                            onClick={() => {
                              setIsAddingRule(true);
                              setEditingRuleIndex(null);
                            }}>
                            {t("add_first_rule")}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            {isAddingRule && (
              <AddRuleDialog
                onClose={() => {
                  setIsAddingRule(false);
                  setEditingRuleIndex(null);
                }}
                onAddRule={addRule}
                initialRule={
                  editingRuleIndex !== null
                    ? form.getValues("variablePricing.rules")[editingRuleIndex]
                    : undefined
                }
              />
            )}
          </>
        )}

        <DialogFooter>
          <Button color="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            onClick={() => {
              const data = form.getValues("variablePricing") as FormData;
              onSubmit(data);
            }}
            loading={updatePricingRulesMutation.isLoading}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddRuleDialogProps {
  onClose: () => void;
  onAddRule: (rule: PricingRule) => void;
  initialRule?: PricingRule;
}

function AddRuleDialog({ onClose, onAddRule, initialRule }: AddRuleDialogProps) {
  const { t } = useLocale();
  const [ruleType, setRuleType] = useState<PricingRule["type"]>(initialRule?.type || "duration");
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);
  const [description, setDescription] = useState(initialRule?.description || "");
  const [action, setAction] = useState<"add" | "subtract" | "multiply" | "divide" | "set">(
    // @ts-expect-error UI-only state
    initialRule?.price ? "set" : "add"
  );
  const [amount, setAmount] = useState<number>(0);

  // Duration condition fields
  const [minDuration, setMinDuration] = useState(
    initialRule?.type === "duration" ? initialRule.condition.minDuration || 0 : 0
  );
  const [maxDuration, setMaxDuration] = useState(
    initialRule?.type === "duration" ? initialRule.condition.maxDuration || 0 : 0
  );

  // Time of day condition fields
  const [startTime, setStartTime] = useState(
    initialRule?.type === "timeOfDay" ? initialRule.condition.startTime || "09:00" : "09:00"
  );
  const [endTime, setEndTime] = useState(
    initialRule?.type === "timeOfDay" ? initialRule.condition.endTime || "17:00" : "17:00"
  );

  // Day of week condition fields
  const [selectedDays, setSelectedDays] = useState<string[]>(
    initialRule?.type === "dayOfWeek" ? initialRule.condition.days || [] : []
  );

  // Custom condition fields
  const [fieldName, setFieldName] = useState(
    (initialRule?.type === "custom" && initialRule.condition.parameters?.field) || ""
  );
  const [comparison, setComparison] = useState(
    (initialRule?.type === "custom" && initialRule.condition.parameters?.comparison) || "eq"
  );
  const [fieldValue, setFieldValue] = useState<string>(
    (initialRule?.type === "custom" && initialRule.condition.parameters?.value?.toString()) || ""
  );
  const [customFunction, setCustomFunction] = useState(
    (initialRule?.type === "custom" && initialRule.condition.script) || ""
  );

  const handleSubmit = () => {
    // Build the condition object based on rule type
    let condition: Record<string, string | number | boolean | string[]> = {};

    if (ruleType === "duration") {
      condition = {
        minDuration: parseInt(minDuration.toString()),
        maxDuration: parseInt(maxDuration.toString()),
      };
    } else if (ruleType === "timeOfDay") {
      condition = {
        startTime,
        endTime,
      };
    } else if (ruleType === "dayOfWeek") {
      condition = {
        days: selectedDays,
      };
    } else if (ruleType === "custom") {
      // For custom rules
      if (comparison === "custom") {
        condition = {
          script: customFunction,
        };
      } else {
        condition = {
          parameters: {
            field: fieldName,
            comparison,
            value: fieldValue,
          },
        };
      }
    }

    // Create the rule object
    const rule: PricingRule = {
      id: initialRule?.id || `rule-${Math.random().toString(36).substring(2, 9)}`,
      type: ruleType,
      enabled,
      description,
      condition,
      ...(action === "set"
        ? { price: Math.round(amount * 100) }
        : action === "add"
        ? { priceModifier: { type: "surcharge", value: Math.round(amount * 100) } }
        : action === "subtract"
        ? { priceModifier: { type: "discount", value: Math.round(amount * 100) } }
        : action === "multiply"
        ? { priceModifier: { type: "surcharge", value: 0, percentage: amount } }
        : action === "divide"
        ? { priceModifier: { type: "discount", value: 0, percentage: amount } }
        : {}),
    };

    onAddRule(rule);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader title={initialRule ? t("edit_rule") : t("add_rule")} />

        <div className="space-y-4">
          <div className="mb-4 flex items-center space-x-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} id="rule-enabled" />
            <Label htmlFor="rule-enabled">{t("rule_enabled")}</Label>
          </div>

          <div>
            <Label htmlFor="rule-description">{t("rule_description")}</Label>
            <TextField
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("e.g._weekend_pricing")}
            />
          </div>

          <div>
            <Label htmlFor="rule-type">{t("rule_type")}</Label>
            <Select
              id="rule-type"
              value={ruleType}
              onChange={(value: string) => setRuleType(value)}
              options={CONDITION_TYPES}
            />
          </div>

          {/* Condition fields based on rule type */}
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">{t("condition")}</h3>

            {ruleType === "duration" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-duration">{t("min_duration")}</Label>
                  <TextField
                    id="min-duration"
                    type="number"
                    min="0"
                    value={minDuration}
                    onChange={(e) => setMinDuration(parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="max-duration">{t("max_duration")}</Label>
                  <TextField
                    id="max-duration"
                    type="number"
                    min="0"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                    placeholder="∞"
                  />
                </div>
              </div>
            )}

            {ruleType === "timeOfDay" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">{t("start_time")}</Label>
                  <TextField
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">{t("end_time")}</Label>
                  <TextField
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {ruleType === "dayOfWeek" && (
              <div>
                <Label className="mb-2 block">{t("select_days")}</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      color={selectedDays.includes(day.value) ? "primary" : "secondary"}
                      onClick={() => {
                        if (selectedDays.includes(day.value)) {
                          setSelectedDays(selectedDays.filter((d) => d !== day.value));
                        } else {
                          setSelectedDays([...selectedDays, day.value]);
                        }
                      }}
                      className="mb-2">
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {ruleType === "custom" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="comparison-type">{t("comparison_type")}</Label>
                  <Select
                    id="comparison-type"
                    value={comparison}
                    onChange={(value: string) => setComparison(value)}
                    options={COMPARISON_OPERATORS}
                  />
                </div>

                {comparison === "custom" ? (
                  <div>
                    <Label htmlFor="custom-function">{t("custom_function")}</Label>
                    <TextField
                      id="custom-function"
                      as="textarea"
                      rows={4}
                      value={customFunction}
                      onChange={(e) => setCustomFunction(e.target.value)}
                      placeholder="function(context) { return true; }"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="field-name">{t("field_name")}</Label>
                      <TextField
                        id="field-name"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value)}
                        placeholder="location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field-value">{t("field_value")}</Label>
                      <TextField
                        id="field-value"
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        placeholder="in-person"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Price modification */}
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">{t("price_modification")}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price-action">{t("action")}</Label>
                <Select
                  id="price-action"
                  value={action}
                  onChange={(value: string) => setAction(value)}
                  options={PRICE_MODIFIER_ACTIONS}
                />
              </div>
              <div>
                <Label htmlFor="price-amount">{t("amount")}</Label>
                <TextField
                  id="price-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button color="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button color="primary" onClick={handleSubmit}>
            {initialRule ? t("update_rule") : t("add_rule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
