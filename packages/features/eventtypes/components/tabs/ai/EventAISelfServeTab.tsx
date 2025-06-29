"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import PhoneInput from "@calcom/features/components/phone-input";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";
import { Input } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ShellSubHeading } from "@calcom/ui/components/layout";
import { showToast } from "@calcom/ui/components/toast";

const setupSchema = z.object({
  calApiKey: z.string().min(1, "API Key is required"),
  timeZone: z.string().min(1, "Timezone is required"),
});

const configAndCallSchema = z.object({
  generalPrompt: z.string(),
  beginMessage: z.string(),
  numberToCall: z.string().optional(),
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
  const { data: aiConfig, isLoading: isLoadingAiConfig } = trpc.viewer.ai.getConfig.useQuery({
    eventTypeId: eventType.id,
  });
  const { timezone: preferredTimezone } = useTimePreferences();

  const { data: llmDetails, isLoading: isLoadingLlmDetails } = trpc.viewer.ai.getLlm.useQuery(
    { llmId: aiConfig?.llmId },
    { enabled: !!aiConfig?.llmId }
  );
  const { data: phoneNumbers } = trpc.viewer.phoneNumbers.list.useQuery();

  const setupMutation = trpc.viewer.ai.setup.useMutation({
    onSuccess: () => {
      utils.viewer.ai.getConfig.invalidate();
      showToast(t("ai_assistant_setup_successfully"), "success");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const updateLlmMutation = trpc.viewer.ai.updateLlm.useMutation();
  const makeCallMutation = trpc.viewer.ai.makePhoneCall.useMutation();

  const buyNumberMutation = trpc.viewer.phoneNumbers.buy.useMutation({
    onSuccess: () => {
      utils.viewer.ai.getConfig.invalidate();
      utils.viewer.phoneNumbers.list.invalidate();
      showToast(t("phone_number_purchased_successfully"), "success");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const setupForm = useForm<z.infer<typeof setupSchema>>({ resolver: zodResolver(setupSchema) });
  const form = useForm<z.infer<typeof configAndCallSchema>>({
    resolver: zodResolver(configAndCallSchema),
    defaultValues: {
      generalPrompt: "",
      beginMessage: "",
      numberToCall: "",
    },
  });

  useEffect(() => {
    if (llmDetails) {
      form.reset({
        generalPrompt: llmDetails.general_prompt,
        beginMessage: llmDetails.begin_message,
        numberToCall: form.getValues().numberToCall, // Keep existing value on re-renders
      });
    }
  }, [llmDetails, form]);

  const assignedPhoneNumber = phoneNumbers?.find((n) => n.id === aiConfig?.yourPhoneNumberId);

  const onSubmit = async (values: z.infer<typeof configAndCallSchema>) => {
    if (!aiConfig?.llmId) return;

    try {
      await updateLlmMutation.mutateAsync({
        llmId: aiConfig.llmId,
        generalPrompt: values.generalPrompt,
        beginMessage: values.beginMessage,
      });
      showToast(t("ai_assistant_updated_successfully"), "success");

      // If a phone number is provided, make the test call.
      if (values.numberToCall) {
        const callData = await makeCallMutation.mutateAsync({
          eventTypeId: eventType.id,
          numberToCall: values.numberToCall,
        });
        showToast(`${t("call_initiated_successfully")} Call ID: ${callData.call_id}`, "success");
      }
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  if (isLoadingAiConfig) return <ShellMain>{t("loading")}</ShellMain>;

  console.log("preferredTimezone", aiConfig);

  if (!aiConfig) {
    const handleSubmit = () => {
      try {
        const values = setupForm.getValues();
        console.log("values", values);
        setupMutation.mutate({ eventTypeId: eventType.id, ...values });
      } catch (e) {
        console.log("e", e);
      }
    };

    return (
      <ShellMain
        heading={t("setup_ai_phone_assistant")}
        subtitle={t("provide_api_key_and_timezone_to_setup")}>
        <Form className="space-y-6" form={setupForm}>
          <TextField
            required
            type="text"
            {...setupForm.register("calApiKey")}
            label={t("cal_api_key")}
            placeholder="cal_live_..."
            data-testid="cal-api-key"
          />

          <Controller
            name="timeZone"
            control={setupForm.control}
            render={({ field: { value } }) => (
              <div>
                <Label className="text-emphasis">
                  <>{t("agent_timezone")}</>
                </Label>
                <TimezoneSelect
                  id="timezone"
                  value={value ?? preferredTimezone}
                  onChange={(event) => {
                    if (event) setupForm.setValue("timeZone", event.value, { shouldDirty: true });
                  }}
                />
              </div>
            )}
          />
          <Button onClick={handleSubmit} loading={setupMutation.isPending}>
            {t("setup_ai_phone_assistant")}
          </Button>
        </Form>
      </ShellMain>
    );
  }

  return (
    <ShellMain>
      <div className="flex flex-col gap-y-6">
        <div>
          <ShellSubHeading
            title={t("assigned_phone_number")}
            subtitle={t("this_is_the_number_your_agent_will_use")}
          />
          <div className="mt-4 max-w-sm">
            {assignedPhoneNumber ? (
              <Input type="tel" readOnly value={assignedPhoneNumber.phoneNumber} />
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
          <Form form={form} handleSubmit={onSubmit} className="mt-4 space-y-6">
            <TextField
              required
              type="text"
              {...form.register("generalPrompt")}
              label={t("general_prompt")}
              placeholder="Enter your general prompt here"
              data-testid="general-prompt"
            />
            <TextField
              required
              type="text"
              {...form.register("beginMessage")}
              label={t("begin_message")}
              placeholder={t("begin_message_description")}
              data-testid="begin-message"
            />

            <Label>{t("number_to_call")}</Label>
            <Controller
              name="numberToCall"
              render={({ field: { onChange, value, name }, fieldState: { error } }) => {
                return (
                  <div>
                    <PhoneInput
                      required
                      placeholder={t("phone_number")}
                      id="numberToCall"
                      name="numberToCall"
                      value={value}
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
              type="submit"
              loading={form.formState.isSubmitting || isLoadingLlmDetails}
              disabled={!assignedPhoneNumber && !!form.getValues().numberToCall}>
              {assignedPhoneNumber ? t("save_and_test_call") : t("save_changes")}
            </Button>
          </Form>
        </div>
      </div>
    </ShellMain>
  );
};
