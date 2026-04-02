"use client";

import { DYNAMIC_TEXT_VARIABLES } from "@calcom/features/ee/workflows/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AddVariablesDropdown } from "@calcom/ui/components/editor";
import { Input, Label, TextArea } from "@calcom/ui/components/form";
import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { AgentFormValues } from "../../types/schemas";
import { LanguageSelector } from "./LanguageSelector";
import { VoiceSelector } from "./VoiceSelector";

interface AgentConfigFormProps {
  form: UseFormReturn<AgentFormValues>;
  readOnly?: boolean;
  selectedVoiceId?: string;
  onVoiceDialogOpen: () => void;
}

export function AgentConfigForm({
  form,
  readOnly = false,
  selectedVoiceId,
  onVoiceDialogOpen,
}: AgentConfigFormProps) {
  const { t } = useLocale();
  const generalPromptRef = useRef<HTMLTextAreaElement | null>(null);

  const addVariableToGeneralPrompt = (variable: string) => {
    if (generalPromptRef.current) {
      const currentPrompt = generalPromptRef.current.value || "";
      const cursorPosition = generalPromptRef.current.selectionStart || currentPrompt.length;
      const variableName = `{${variable.toUpperCase().replace(/ /g, "_")}}`;
      const newPrompt = `${currentPrompt.substring(
        0,
        cursorPosition
      )}${variableName}${currentPrompt.substring(cursorPosition)}`;

      form.setValue("generalPrompt", newPrompt, { shouldDirty: true, shouldTouch: true });

      requestAnimationFrame(() => {
        if (generalPromptRef.current) {
          generalPromptRef.current.focus();
          generalPromptRef.current.setSelectionRange(
            cursorPosition + variableName.length,
            cursorPosition + variableName.length
          );
        }
      });
    }
  };

  return (
    <div className="stack-y-4">
      <LanguageSelector control={form.control} name="language" disabled={readOnly} />

      <VoiceSelector
        selectedVoiceId={selectedVoiceId}
        onVoiceDialogOpen={onVoiceDialogOpen}
        disabled={readOnly}
      />

      <div>
        <Label className="text-emphasis mb-1 block text-sm font-medium">{t("initial_message")} *</Label>
        <p className="text-subtle mb-1.5 text-xs">{t("initial_message_description")}</p>
        <Input
          type="text"
          {...form.register("beginMessage")}
          placeholder={t("hi_how_are_you_doing")}
          disabled={readOnly}
        />
      </div>

      <div>
        <div className="mb-1.5">
          <Label className="text-emphasis mb-1 block text-sm font-medium">{t("general_prompt")} *</Label>
          <p className="text-subtle text-xs">{t("general_prompt_description")}</p>
        </div>
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 p-2">
          {!readOnly && (
            <AddVariablesDropdown
              addVariable={addVariableToGeneralPrompt}
              variables={[...DYNAMIC_TEXT_VARIABLES, "number_to_call"]}
              addVariableButtonClassName="border rounded-[10px] py-1 px-1"
            />
          )}
        </div>
        <TextArea
          {...form.register("generalPrompt")}
          ref={(e) => {
            form.register("generalPrompt").ref(e);
            generalPromptRef.current = e;
          }}
          placeholder={t("enter_the_general_prompt_for_the_agent")}
          className="min-h-[500px] rounded-t-none"
          disabled={readOnly}
        />
      </div>

      {/* Commented code for future tools implementation */}
      {/* <div className="p-4 rounded-lg border border-subtle bg-default">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-sm font-medium text-emphasis">{t("Functions")}</h4>
            <p className="text-xs text-subtle">
              {t(
                "Enable your agent with capabilities such as calendar bookings, call termination, etc."
              )}
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddToolDialog}
            color="secondary"
            size="sm"
            disabled={readOnly}>
            <Icon name="plus" className="mr-2 w-4 h-4" />
            {t("Add Function")}
          </Button>
        </div>
        <div className="stack-y-3">
          {toolFields.map((tool, idx) => (
            <div
              key={tool.id}
              className="flex justify-between items-center p-4 rounded-lg border transition-colors border-subtle bg-cal-muted hover:bg-default">
              <div className="flex gap-3">
                <div className="flex justify-center items-center w-8 h-8 rounded-md border bg-default border-subtle">
                  <Icon name="zap" className="w-4 h-4 text-emphasis" />
                </div>
                <div>
                  <p className="font-medium text-emphasis">{tool.name}</p>
                  <p className="text-sm text-subtle">
                    {tool.type === "check_availability_cal" && t("Check Availability")}
                    {tool.type === "book_appointment_cal" && t("Book Appointment")}
                    {tool.type === "end_call" && t("End Call")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  size="sm"
                  color="secondary"
                  variant="icon"
                  onClick={() => openEditToolDialog(idx)}
                  disabled={readOnly}>
                  <Icon name="pencil" className="w-4 h-4" />
                </Button>
                {tool.name !== "end_call" && (
                  <Button
                    type="button"
                    color="destructive"
                    variant="icon"
                    size="sm"
                    onClick={() => handleToolDelete(idx)}
                    disabled={readOnly}>
                    <Icon name="trash" className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {toolFields.length === 0 && (
            <div className="flex flex-col justify-center items-center p-6 text-center rounded-lg border border-subtle bg-cal-muted">
              <Icon name="zap" className="w-6 h-6 text-subtle" />
              <p className="mt-2 text-sm text-subtle">{t("No functions configured yet")}</p>
              <p className="text-xs text-subtle">
                {t("Add functions to enable advanced capabilities")}
              </p>
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
}
