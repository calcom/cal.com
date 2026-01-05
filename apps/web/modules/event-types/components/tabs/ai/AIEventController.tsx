import * as RadioGroup from "@radix-ui/react-radio-group";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { z } from "zod";

import { getTemplateFieldsSchema } from "@calcom/features/calAIPhone/getTemplateFieldsSchema";
import { templateFieldsMap } from "@calcom/features/calAIPhone/template-fields-map";
import type { TemplateType } from "@calcom/features/calAIPhone/zod-utils";
import PhoneInput from "@calcom/features/components/phone-input";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import type { EventTypeSetup, FormValues } from "@calcom/features/eventtypes/lib/types";
import { ComponentForField } from "@calcom/features/form-builder/FormBuilderField";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Divider } from "@calcom/ui/components/divider";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type AIEventControllerProps = {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
};

export default function AIEventController({ eventType, isTeamEvent }: AIEventControllerProps) {
  const { t } = useLocale();
  const session = useSession();
  const [aiEventState, setAIEventState] = useState<boolean>(eventType?.aiPhoneCallConfig?.enabled ?? false);
  const formMethods = useFormContext<FormValues>();

  const isOrg = !!session.data?.user?.org?.id;

  if (session.status === "loading") return <></>;

  return (
    <LicenseRequired>
      <div className="block items-start sm:flex">
        {!isOrg || !isTeamEvent ? (
          <EmptyScreen
            headline={t("Cal.ai")}
            Icon="sparkles"
            description={t("upgrade_to_cal_ai_phone_number_description")}
            buttonRaw={<Button href="/enterprise">{t("upgrade")}</Button>}
          />
        ) : (
          <div className="w-full">
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                aiEventState && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              title={t("Cal.ai")}
              description={t("use_cal_ai_to_make_call_description")}
              checked={aiEventState}
              data-testid="instant-event-check"
              onCheckedChange={(e) => {
                if (!e) {
                  formMethods.setValue("aiPhoneCallConfig.enabled", false, {
                    shouldDirty: true,
                  });
                  setAIEventState(false);
                } else {
                  formMethods.setValue("aiPhoneCallConfig.enabled", true, {
                    shouldDirty: true,
                  });
                  setAIEventState(true);
                }
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                {aiEventState && <AISettings eventType={eventType} />}
              </div>
            </SettingsToggle>
          </div>
        )}
      </div>
    </LicenseRequired>
  );
}

const ErrorMessage = ({ fieldName, message }: { fieldName: string; message: string }) => {
  const { t } = useLocale();
  return (
    <div data-testid={`error-message-${fieldName}`} className="mt-2 flex items-center text-sm text-red-700 ">
      <Icon name="info" className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
      <p>{t(message || "invalid_input")}</p>
    </div>
  );
};

const TemplateFields = () => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { control, watch } = formMethods;

  const templateType = watch("aiPhoneCallConfig.templateType");
  const fields = templateFieldsMap[templateType as TemplateType];

  return (
    <div className="stack-y-4">
      {fields?.map((field) => (
        <div key={field.name}>
          <Controller
            control={control}
            name={`aiPhoneCallConfig.${field.name}`}
            render={({ field: { value, onChange }, fieldState: { error } }) => {
              const { variableName, ...restField } = field;
              const variableInfo = !!variableName ? `: ${t("variable")} {{${variableName}}}` : "";
              return (
                <div>
                  <ComponentForField
                    field={{
                      ...restField,
                      label: `${t(field.defaultLabel)}${variableInfo}`,
                      placeholder: t(field.placeholder),
                    }}
                    value={value ?? ""}
                    readOnly={false}
                    setValue={(val: unknown) => {
                      onChange(val);
                    }}
                  />
                  {error?.message && <ErrorMessage message={error.message} fieldName={field.name} />}
                </div>
              );
            }}
          />
        </div>
      ))}
    </div>
  );
};

const AISettings = ({ eventType }: { eventType: EventTypeSetup }) => {
  const { t } = useLocale();

  const formMethods = useFormContext<FormValues>();

  const [calApiKey, setCalApiKey] = useState("");

  const createCallMutation = trpc.viewer.organizations.createPhoneCall.useMutation({
    onSuccess: (data) => {
      if (!!data?.callId) {
        showToast("Phone Call Created successfully", "success");
      }
    },
    onError: (err) => {
      const message = err?.message ? err.message : t("something_went_wrong");
      showToast(message, "error");
    },
  });

  const handleSubmit = async () => {
    try {
      const values = formMethods.getValues("aiPhoneCallConfig");
      const { templateType } = values;

      const schema = getTemplateFieldsSchema({ templateType });

      const data = schema.parse({
        ...values,
        guestEmail: values.guestEmail && values.guestEmail.trim().length ? values.guestEmail : undefined,
        guestCompany:
          values.guestCompany && values.guestCompany.trim().length ? values.guestCompany : undefined,
        guestName: values.guestName && values.guestName.trim().length ? values.guestName : undefined,
        eventTypeId: eventType.id,
        calApiKey,
        id: eventType.id,
      });

      createCallMutation.mutate(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldName = err.issues?.[0]?.path?.[0];
        const message = err.issues?.[0]?.message;
        showToast(`Error on ${fieldName}: ${message} `, "error");

        const issues = err.issues;
        for (const issue of issues) {
          const fieldName = `aiPhoneCallConfig.${issue.path[0]}` as unknown as keyof FormValues;
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

  return (
    <div>
      <div className="stack-y-4">
        <>
          <Label>{t("your_phone_number")}</Label>
          <Controller
            name="aiPhoneCallConfig.yourPhoneNumber"
            render={({ field: { onChange, value, name }, fieldState: { error } }) => {
              return (
                <div>
                  <PhoneInput
                    required
                    placeholder={t("your_phone_number")}
                    id="aiPhoneCallConfig.yourPhoneNumber"
                    name="aiPhoneCallConfig.yourPhoneNumber"
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

          <>
            <RadioGroup.Root
              defaultValue={eventType?.aiPhoneCallConfig?.templateType ?? "CUSTOM_TEMPLATE"}
              onValueChange={(val) => {
                formMethods.setValue("aiPhoneCallConfig.templateType", val, { shouldDirty: true });
              }}>
              <div className="flex gap-2">
                <div className="flex flex-1 rounded-lg border p-4">
                  <RadioGroup.Item
                    id="CHECK_IN_APPOINTMENT"
                    key="CHECK_IN_APPOINTMENT"
                    value="CHECK_IN_APPOINTMENT"
                    className="min-w-4 bg-default border-default flex h-4 w-4 cursor-pointer items-center rounded-full border focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2 ">
                    <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />
                  </RadioGroup.Item>
                  <label className="h-full" htmlFor="CHECK_IN_APPOINTMENT">
                    <h2 className="font-semibold leading-tight">{t("check_in_assistant")}</h2>
                    <p className="text-subtle mt-2">{t("check_in_assistant_description")}</p>
                  </label>
                </div>
                <div className="flex flex-1 rounded-lg border p-4">
                  <RadioGroup.Item
                    id="CUSTOM_TEMPLATE"
                    key="CUSTOM_TEMPLATE"
                    value="CUSTOM_TEMPLATE"
                    className="min-w-4 bg-default border-default flex h-4 w-4 cursor-pointer items-center rounded-full border focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                    <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />
                  </RadioGroup.Item>
                  <label htmlFor="CUSTOM_TEMPLATE">
                    <h2 className="font-semibold leading-tight">{t("custom_template")}</h2>
                    <p className="text-subtle mt-2">{t("create_your_own_prompt")}</p>
                  </label>
                </div>
              </div>
            </RadioGroup.Root>
          </>

          <Label>{t("number_to_call")}</Label>
          <Controller
            name="aiPhoneCallConfig.numberToCall"
            render={({ field: { onChange, value, name }, fieldState: { error } }) => {
              return (
                <div>
                  <PhoneInput
                    required
                    placeholder={t("phone_number")}
                    id="aiPhoneCallConfig.numberToCall"
                    name="aiPhoneCallConfig.numberToCall"
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

          <TemplateFields />

          <Divider />
        </>

        <TextField
          type="text"
          hint="For eg:- cal_live_0123.."
          label={t("provide_api_key")}
          name="calApiKey"
          placeholder="Cal API Key"
          value={calApiKey}
          onChange={(e) => {
            setCalApiKey(e.target.value);
          }}
        />

        <Divider />

        <Button
          disabled={createCallMutation.isPending}
          loading={createCallMutation.isPending}
          onClick={handleSubmit}>
          {t("make_a_call")}
        </Button>

        {/* TODO:<small className="block opacity-60">
          Want to automate outgoing phone calls? Read our{" "}
          <Link className="underline" href="https://cal.com/docs">
            API docs
          </Link>{" "}
          and learn how to build workflows.
        </small> */}
      </div>
    </div>
  );
};
