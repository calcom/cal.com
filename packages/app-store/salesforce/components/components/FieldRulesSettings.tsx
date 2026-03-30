import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { InputField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Section } from "@calcom/ui/components/section";

import type { RRSkipFieldRule } from "../../zod";
import { RRSkipFieldRuleActionEnum } from "../../zod";

type FieldRuleAction = (typeof RRSkipFieldRuleActionEnum)[keyof typeof RRSkipFieldRuleActionEnum];

const FieldRulesSettings = ({
  fieldRules,
  updateFieldRules,
}: {
  fieldRules: RRSkipFieldRule[];
  updateFieldRules: (rules: RRSkipFieldRule[]) => void;
}) => {
  const { t } = useLocale();

  const actionOptions = [
    { label: t("salesforce_rr_skip_field_rule_ignore"), value: RRSkipFieldRuleActionEnum.IGNORE },
    { label: t("salesforce_rr_skip_field_rule_must_include"), value: RRSkipFieldRuleActionEnum.MUST_INCLUDE },
  ];

  const [newRule, setNewRule] = useState<{ field: string; value: string; action: FieldRuleAction }>({
    field: "",
    value: "",
    action: RRSkipFieldRuleActionEnum.IGNORE,
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingRule, setEditingRule] = useState<{
    field: string;
    value: string;
    action: FieldRuleAction;
  } | null>(null);

  const startEditing = (index: number) => {
    const rule = fieldRules[index];
    setEditingIndex(index);
    setEditingRule({ field: rule.field, value: rule.value, action: rule.action });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingRule(null);
  };

  const saveEditing = () => {
    if (editingIndex === null || !editingRule) return;
    if (!editingRule.field.trim() || !editingRule.value.trim()) return;

    const newRules = [...fieldRules];
    newRules[editingIndex] = {
      field: editingRule.field.trim(),
      value: editingRule.value.trim(),
      action: editingRule.action,
    };
    updateFieldRules(newRules);
    cancelEditing();
  };

  return (
    <Section.SubSection>
      <Section.SubSectionHeader
        icon="filter"
        title={t("salesforce_rr_skip_field_rules")}
        labelFor="rr-skip-field-rules">
        <></>
      </Section.SubSectionHeader>
      <Section.SubSectionContent>
        <div className="text-subtle flex gap-3 px-3 py-[6px] text-sm font-medium">
          <div className="flex-1">{t("field_name")}</div>
          <div className="flex-1">{t("value")}</div>
          <div className="w-32">{t("action")}</div>
          <div className="w-20" />
        </div>
        <Section.SubSectionNested>
          {fieldRules.map((rule, index) => {
            const isEditing = editingIndex === index;
            return (
              <div className="flex items-center gap-2" key={`${rule.field}-${index}`}>
                <div className="flex-1">
                  {isEditing ? (
                    <InputField
                      value={editingRule?.field || ""}
                      onChange={(e) =>
                        setEditingRule((prev) => (prev ? { ...prev, field: e.target.value } : null))
                      }
                      size="sm"
                      className="w-full"
                    />
                  ) : (
                    <InputField value={rule.field} readOnly size="sm" className="w-full" />
                  )}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <InputField
                      value={editingRule?.value || ""}
                      onChange={(e) =>
                        setEditingRule((prev) => (prev ? { ...prev, value: e.target.value } : null))
                      }
                      size="sm"
                      className="w-full"
                    />
                  ) : (
                    <InputField value={rule.value} readOnly size="sm" className="w-full" />
                  )}
                </div>
                <div className="w-32">
                  {isEditing ? (
                    <Select
                      size="sm"
                      className="w-full"
                      options={actionOptions}
                      value={actionOptions.find((opt) => opt.value === editingRule?.action)}
                      onChange={(e) => {
                        if (e) {
                          setEditingRule((prev) => (prev ? { ...prev, action: e.value } : null));
                        }
                      }}
                    />
                  ) : (
                    <Select
                      size="sm"
                      className="w-full"
                      options={actionOptions}
                      value={actionOptions.find((opt) => opt.value === rule.action)}
                      isDisabled={true}
                    />
                  )}
                </div>
                <div className="flex w-20 justify-center gap-1">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        StartIcon="check"
                        variant="icon"
                        color="primary"
                        onClick={() => saveEditing()}
                      />
                      <Button
                        size="sm"
                        StartIcon="x"
                        variant="icon"
                        color="secondary"
                        onClick={() => cancelEditing()}
                      />
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        StartIcon="pencil"
                        variant="icon"
                        color="minimal"
                        onClick={() => startEditing(index)}
                      />
                      <Button
                        StartIcon="x"
                        variant="icon"
                        size="sm"
                        color="minimal"
                        onClick={() => {
                          updateFieldRules(fieldRules.filter((_, i) => i !== index));
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div className="mt-2 flex gap-2">
            <div className="flex-1">
              <InputField
                size="sm"
                className="w-full"
                placeholder={t("salesforce_field_name_placeholder")}
                value={newRule.field}
                onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <InputField
                size="sm"
                className="w-full"
                placeholder={t("value")}
                value={newRule.value}
                onChange={(e) => setNewRule({ ...newRule, value: e.target.value })}
              />
            </div>
            <div className="w-32">
              <Select
                size="sm"
                className="w-full"
                options={actionOptions}
                value={actionOptions.find((opt) => opt.value === newRule.action)}
                onChange={(e) => {
                  if (e) {
                    setNewRule({ ...newRule, action: e.value });
                  }
                }}
              />
            </div>
            <div className="w-20" />
          </div>
        </Section.SubSectionNested>
        <Button
          className="text-subtle mt-2 w-fit"
          StartIcon="plus"
          color="minimal"
          size="sm"
          disabled={!(newRule.field && newRule.value)}
          onClick={() => {
            updateFieldRules([
              ...fieldRules,
              {
                field: newRule.field.trim(),
                value: newRule.value.trim(),
                action: newRule.action,
              },
            ]);
            setNewRule({ field: "", value: "", action: RRSkipFieldRuleActionEnum.IGNORE });
          }}>
          {t("add_new_rule")}
        </Button>
      </Section.SubSectionContent>
    </Section.SubSection>
  );
};

export default FieldRulesSettings;
