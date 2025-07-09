"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFormContext, Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import PhoneInput from "@calcom/features/components/phone-input";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { ShellMain } from "@calcom/features/shell/Shell";
import { formatPhoneNumber } from "@calcom/lib/formatPhoneNumber";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { TextAreaField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ShellSubHeading } from "@calcom/ui/components/layout";
import { showToast } from "@calcom/ui/components/toast";

const setupSchema = z.object({
  agentTimeZone: z.string().min(1, "Timezone is required"),
});

const ErrorMessage = ({ fieldName, message }: { fieldName: string; message: string }) => {
  const { t } = useLocale();
  return (
    <div data-testid={`error-message-${fieldName}`} className="mt-2 flex items-center text-sm text-red-700 ">
      <Icon name="info" className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
      <p>{t(message || "invalid_input")}</p>
    </div>
  );
};

export const EventAISelfServeTab = ({ eventType }: { eventType: EventTypeSetupProps["eventType"] }) => {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const formMethods = useFormContext<FormValues>();

  const { data: aiConfig, isLoading: isLoadingAiConfig } =
    trpc.viewer.loggedInViewerRouter.getConfig.useQuery({
      eventTypeId: eventType.id,
    });

  const { timezone: preferredTimezone } = useTimePreferences();

  const { data: llmDetails, isLoading: isLoadingLlmDetails } =
    trpc.viewer.loggedInViewerRouter.getLlm.useQuery(
      { llmId: aiConfig?.llmId as string },
      { enabled: !!aiConfig?.llmId }
    );
  const { data: phoneNumbers } = trpc.viewer.loggedInViewerRouter.list.useQuery();
  const makeCallMutation = trpc.viewer.loggedInViewerRouter.makeSelfServePhoneCall.useMutation();

  const setupMutation = trpc.viewer.loggedInViewerRouter.setup.useMutation({
    onSuccess: () => {
      utils.viewer.loggedInViewerRouter.getConfig.invalidate();
      showToast(t("ai_assistant_setup_successfully"), "success");
    },
    onError: (error: any) => showToast(error.message, "error"),
  });

  const updateLlmMutation = trpc.viewer.loggedInViewerRouter.updateLlm.useMutation();

  const buyNumberMutation = trpc.viewer.loggedInViewerRouter.buy.useMutation({
    onSuccess: () => {
      utils.viewer.loggedInViewerRouter.getConfig.invalidate();
      utils.viewer.loggedInViewerRouter.list.invalidate();
      showToast(t("phone_number_purchased_successfully"), "success");
    },
    onError: (error: any) => showToast(error.message, "error"),
  });

  const setupForm = useForm<z.infer<typeof setupSchema>>({ resolver: zodResolver(setupSchema) });

  console.log("form.getValues()", aiConfig, formMethods.getValues());

  const assignedPhoneNumber = phoneNumbers?.find((n) => n.id === aiConfig?.yourPhoneNumberId);

  const handlePhoneCall = async () => {
    const values = formMethods.getValues("aiSelfServeConfiguration");
    console.log("aiConfig", values, aiConfig);
    if (!aiConfig?.llmId) return;

    try {
      await updateLlmMutation.mutateAsync({
        llmId: aiConfig.llmId,
        generalPrompt: values.generalPrompt,
        beginMessage: values.beginMessage,
      });
      showToast(t("initiating_call"), "success");

      // If a phone number is provided, make the test call.
      if (values.numberToCall) {
        const callData = await makeCallMutation.mutateAsync({
          eventTypeId: eventType.id,
          numberToCall: values.numberToCall,
        });
        showToast(`${t("call_initiated_successfully")} Call ID: ${callData?.call_id}`, "success");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldName = err.issues?.[0]?.path?.[0];
        const message = err.issues?.[0]?.message;
        showToast(`Error on ${fieldName}: ${message} `, "error");

        const issues = err.issues;
        for (const issue of issues) {
          const fieldName = `aiSelfServeConfiguration.${issue.path[0]}` as unknown as keyof FormValues;
          formMethods.setError(fieldName, {
            type: "custom",
            message: issue.message,
          });
        }
      } else {
        showToast(t("something_went_wrong"), "error");
      }
    }
  };

  console.log("aiConfig", aiConfig);

  if (isLoadingAiConfig || isLoadingLlmDetails) return <></>;

  if (!aiConfig) {
    const handleSubmit = () => {
      try {
        const values = setupForm.getValues();
        const { agentTimeZone, calApiKey } = values;
        setupMutation.mutate({
          eventTypeId: eventType.id,
          agentTimeZone: agentTimeZone ?? preferredTimezone,
          calApiKey,
        });
        showToast(t("ai_assistant_setup_successfully"), "success");
      } catch (e) {
        console.log("e", e);
        showToast(t("error_setting_up_ai_assistant"), "error");
      }
    };

    return (
      <div>
        <div className="border-subtle rounded-lg rounded-b-none border px-4 py-6 sm:px-6">
          <h2 className="text-emphasis text-md font-medium">{t("setup_ai_phone_assistant")}</h2>
          <p className="text-subtle text-sm">{t("provide_api_key_and_timezone_to_setup")}</p>
        </div>
        <div className="border-subtle flex flex-col gap-y-6 rounded-b-lg border border-t-0 p-6">
          <Controller
            name="agentTimeZone"
            control={setupForm.control}
            render={({ field: { value } }) => (
              <div>
                <Label className="text-emphasis">
                  <>{t("agent_timezone")}</>
                </Label>
                <TimezoneSelect
                  id="agentTimeZone"
                  value={value ?? preferredTimezone}
                  onChange={(event) => {
                    if (event) setupForm.setValue("agentTimeZone", event.value, { shouldDirty: true });
                  }}
                />
              </div>
            )}
          />
          <Button className="w-48" onClick={handleSubmit} loading={setupMutation.isPending}>
            {t("setup_ai_phone_assistant")}
          </Button>
        </div>
      </div>
    );
  }

  if (!llmDetails) return <ShellMain>{t("error_loading_llm")}</ShellMain>;

  return (
    <div>
      <div className="border-subtle rounded-lg rounded-b-none border px-4 py-6 sm:px-6">
        <h2 className="text-emphasis text-md font-medium">Cal.ai</h2>
        <p className="text-subtle text-sm">{t("use_cal_ai_to_make_call_description")}</p>
      </div>
      <div className="border-subtle flex flex-col gap-y-6 rounded-b-lg border border-t-0 p-6">
        <div>
          <ShellSubHeading
            title={t("assigned_phone_number")}
            subtitle={t("this_is_the_number_your_agent_will_use")}
          />
          <div className="mt-4 max-w-sm">
            {!!phoneNumbers?.length ? (
              <Select
                options={phoneNumbers?.map((phoneNumber) => {
                  const isAssignedToOtherEventType =
                    phoneNumber?.aiSelfServeConfigurations?.eventTypeId &&
                    phoneNumber?.aiSelfServeConfigurations.eventTypeId !== eventType.id;
                  return {
                    label: phoneNumber.phoneNumber,
                    value: phoneNumber.id,
                    isDisabled: !!isAssignedToOtherEventType,
                  };
                })}
                isOptionDisabled={(option) => {
                  return option.isDisabled;
                }}
                placeholder={t("choose_phone_number")}
                value={
                  !!assignedPhoneNumber?.phoneNumber
                    ? { label: assignedPhoneNumber.phoneNumber, value: assignedPhoneNumber.id }
                    : undefined
                }
                getOptionLabel={(option) => {
                  console.log("option", option);
                  return `${formatPhoneNumber(option.label)} ${option.isDisabled ? "(Taken)" : ""}`;
                }}
                onChange={(e) => {
                  console.log("e", e);
                  if (e) {
                    formMethods.setValue("aiSelfServeConfiguration.yourPhoneNumber", e.label);
                    formMethods.setValue("aiSelfServeConfiguration.yourPhoneNumberId", e.value);
                  } else {
                    formMethods.setValue("aiSelfServeConfiguration.yourPhoneNumber", null);
                    formMethods.setValue("aiSelfServeConfiguration.yourPhoneNumberId", null);
                  }
                }}
              />
            ) : (
              <Button
                onClick={() => buyNumberMutation.mutate({ eventTypeId: eventType.id })}
                loading={buyNumberMutation.isPending}>
                {t("buy_and_assign_number")}
              </Button>
            )}
          </div>
        </div>
        <div>
          <ShellSubHeading title={t("configure_agent")} subtitle={t("configure_agent_subtitle")} />
          <div className="mt-4 space-y-6">
            <TextAreaField
              required
              {...formMethods.register("aiSelfServeConfiguration.generalPrompt")}
              label={t("general_prompt")}
              placeholder="Enter your general prompt here"
              data-testid="general-prompt"
              className="h-[200px]"
            />
            <TextField
              required
              type="text"
              {...formMethods.register("aiSelfServeConfiguration.beginMessage")}
              label={t("begin_message")}
              placeholder={t("begin_message_description")}
              data-testid="begin-message"
            />

            <Label>{t("number_to_call")}</Label>
            <Controller
              name="aiSelfServeConfiguration.numberToCall"
              control={formMethods.control}
              render={({ field: { onChange, value, name }, fieldState: { error } }) => {
                return (
                  <div>
                    <PhoneInput
                      required
                      placeholder={t("phone_number")}
                      id="numberToCall"
                      name="numberToCall"
                      value={value ?? ""}
                      onChange={(val) => {
                        onChange(val);
                      }}
                    />
                    {error?.message && <ErrorMessage message={error.message} fieldName={name} />}
                  </div>
                );
              }}
            />

            <Button
              onClick={handlePhoneCall}
              loading={
                formMethods.formState.isSubmitting ||
                isLoadingLlmDetails ||
                makeCallMutation.isPending ||
                updateLlmMutation.isPending
              }
              disabled={!assignedPhoneNumber && !!formMethods.getValues().numberToCall}>
              {assignedPhoneNumber ? t("save_and_test_call") : t("save_changes")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
