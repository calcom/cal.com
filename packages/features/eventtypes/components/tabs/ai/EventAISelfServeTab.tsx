"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@calcom/ui/components/form";
import { Input } from "@calcom/ui/components/input";
import { ShellMain, ShellSubHeading } from "@calcom/ui/components/shell";
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

export const EventAISelfServeTab = ({ eventType }: { eventType: EventTypeSetupProps["eventType"] }) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: aiConfig, isLoading: isLoadingAiConfig } = trpc.viewer.ai.getConfig.useQuery({
    eventTypeId: eventType.id,
  });

  const { data: llmDetails, isLoading: isLoadingLlmDetails } = trpc.viewer.ai.getLlm.useQuery(
    // @ts-expect-error - llmId can be null, query is disabled if so
    { llmId: aiConfig?.llmId },
    { enabled: !!aiConfig?.llmId }
  );
  const { data: phoneNumbers } = trpc.viewer.phoneNumbers.list.useQuery();

  const setupMutation = trpc.viewer.ai.setup.useMutation({
    onSuccess: () => {
      utils.viewer.ai.getConfig.invalidate({ eventTypeId: eventType.id });
      showToast(t("ai_assistant_setup_successfully"), "success");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const updateLlmMutation = trpc.viewer.ai.updateLlm.useMutation();
  const makeCallMutation = trpc.viewer.ai.makePhoneCall.useMutation();

  const buyNumberMutation = trpc.viewer.phoneNumbers.buy.useMutation({
    onSuccess: () => {
      utils.viewer.ai.getConfig.invalidate({ eventTypeId: eventType.id });
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

  if (!aiConfig) {
    return (
      <ShellMain
        heading={t("setup_ai_phone_assistant")}
        subtitle={t("provide_api_key_and_timezone_to_setup")}>
        <Form {...setupForm}>
          <form
            onSubmit={setupForm.handleSubmit((values) =>
              setupMutation.mutate({ eventTypeId: eventType.id, ...values })
            )}
            className="space-y-6">
            <FormField
              control={setupForm.control}
              name="calApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cal_api_key")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="cal_live_..." />
                  </FormControl>
                  <FormDescription>{t("cal_api_key_description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={setupForm.control}
              name="timeZone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("agent_timezone")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="America/New_York" />
                  </FormControl>
                  <FormDescription>{t("agent_timezone_description")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" loading={setupMutation.isPending}>
              {t("setup_ai_assistant")}
            </Button>
          </form>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-6">
              <FormField
                control={form.control}
                name="generalPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("general_prompt")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>{t("general_prompt_description")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="beginMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("begin_message")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>{t("begin_message_description")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {assignedPhoneNumber && (
                <FormField
                  control={form.control}
                  name="numberToCall"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("phone_number_to_test")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="+15551234567" />
                      </FormControl>
                      <FormDescription>{t("enter_a_number_to_test_your_agent")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button
                type="submit"
                loading={form.formState.isSubmitting || isLoadingLlmDetails}
                disabled={!assignedPhoneNumber && !!form.getValues().numberToCall}>
                {assignedPhoneNumber ? t("save_and_test_call") : t("save_changes")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </ShellMain>
  );
};
