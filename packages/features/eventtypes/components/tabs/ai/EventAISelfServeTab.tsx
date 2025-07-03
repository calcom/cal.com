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
import { Label } from "@calcom/ui/components/form";
import { TextAreaField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ShellSubHeading } from "@calcom/ui/components/layout";
import { showToast } from "@calcom/ui/components/toast";

const formatPhoneNumber = (phoneNumber: string) => {
  const cleaned = `${phoneNumber}`.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }
  return phoneNumber;
};

const PhoneNumberOption = (props: {
  option: { label: string; value: number };
  isSelected: boolean;
  prefix: string;
}) => {
  const { t } = useLocale();
  return (
    <div className="flex items-center">
      <div className="flex-grow">
        <span className="text-emphasis text-sm font-medium">{formatPhoneNumber(props.option.label)}</span>
      </div>
      {props.isSelected && <span className="text-brand-default text-sm font-medium">{t("selected")}</span>}
    </div>
  );
};

const setupSchema = z.object({
  calApiKey: z.string().min(1, "API Key is required"),
  timeZone: z.string().min(1, "Timezone is required"),
});

const configAndCallSchema = z.object({
  generalPrompt: z.string(),
  beginMessage: z.string(),
  numberToCall: z.string().nullable(),
  yourPhoneNumber: z.string().nullable(),
  yourPhoneNumberId: z.number().nullable(),
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
  const form = useForm<z.infer<typeof configAndCallSchema>>({
    resolver: zodResolver(configAndCallSchema),
    defaultValues: {
      generalPrompt: "",
      beginMessage: "",
      numberToCall: aiConfig?.numberToCall || null,
      yourPhoneNumber: aiConfig?.yourPhoneNumber?.phoneNumber || null,
      yourPhoneNumberId: aiConfig?.yourPhoneNumber?.id || null,
    },
  });

  console.log("form.getValues()", aiConfig, form.getValues());

  useEffect(() => {
    if (llmDetails) {
      form.reset({
        generalPrompt: llmDetails.general_prompt,
        beginMessage: llmDetails.begin_message || "",
      });
    }
  }, [llmDetails, form]);

  useEffect(() => {
    if (aiConfig) {
      form.reset({
        numberToCall: aiConfig.numberToCall || null,
        yourPhoneNumber: aiConfig.yourPhoneNumber?.phoneNumber || null,
        yourPhoneNumberId: aiConfig.yourPhoneNumber?.id || null,
      });
    }
  }, [aiConfig, form]);

  const assignedPhoneNumber = phoneNumbers?.find((n) => n.id === aiConfig?.yourPhoneNumberId);

  const handlePhoneCall = async () => {
    const values = form.getValues();
    console.log("aiConfig", values, aiConfig);
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
        showToast(`${t("call_initiated_successfully")} Call ID: ${callData?.call_id}`, "success");
      }
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  if (isLoadingAiConfig) return <ShellMain>{t("loading")}</ShellMain>;

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
        <div className="space-y-6">
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
        </div>
      </ShellMain>
    );
  }

  if (isLoadingLlmDetails) return <ShellMain>{t("loading")}</ShellMain>;

  return (
    <ShellMain>
      <div className="flex flex-col gap-y-6">
        <div>
          <ShellSubHeading
            title={t("assigned_phone_number")}
            subtitle={t("this_is_the_number_your_agent_will_use")}
          />
          <div className="mt-4 max-w-sm">
            {!!phoneNumbers?.length ? (
              <Select
                options={phoneNumbers?.map((n) => ({
                  label: n.phoneNumber,
                  value: n.id,
                }))}
                placeholder={t("choose_phone_number")}
                value={
                  !!assignedPhoneNumber?.phoneNumber
                    ? { label: assignedPhoneNumber.phoneNumber, value: assignedPhoneNumber.id }
                    : undefined
                }
                formatOptionLabel={(option, { context }) => (
                  <PhoneNumberOption
                    option={option}
                    isSelected={
                      context === "menu"
                        ? assignedPhoneNumber?.id === option.value
                        : false /* isSelected is for menu only */
                    }
                    prefix={t("phone_number")}
                  />
                )}
                onChange={(e) => {
                  console.log("e", e);
                  if (e) {
                    form.setValue("yourPhoneNumber", e.label);
                    form.setValue("yourPhoneNumberId", e.value);
                  } else {
                    form.setValue("yourPhoneNumber", null);
                    form.setValue("yourPhoneNumberId", null);
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
              {...form.register("generalPrompt")}
              label={t("general_prompt")}
              placeholder="Enter your general prompt here"
              data-testid="general-prompt"
              className="h-[200px]"
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
              control={form.control}
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
                        // form.setValue("numberToCall", val);
                      }}
                    />
                    {error?.message && <ErrorMessage message={error.message} fieldName={name} />}
                  </div>
                );
              }}
            />

            <Button
              onClick={handlePhoneCall}
              loading={form.formState.isSubmitting || isLoadingLlmDetails}
              disabled={!assignedPhoneNumber && !!form.getValues().numberToCall}>
              {assignedPhoneNumber ? t("save_and_test_call") : t("save_changes")}
            </Button>
          </div>
        </div>
      </div>
    </ShellMain>
  );
};
