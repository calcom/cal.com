import { ErrorMessage } from "@hookform/error-message";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { useSession } from "next-auth/react";
import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { z } from "zod";

import { TEMPLATES_FIELDS } from "@calcom/features/bookings/lib/cal-ai-phone/template-fields-map";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { ComponentForField } from "@calcom/features/form-builder/FormBuilderField";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AIPhoneSettingSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Label,
  EmptyScreen,
  SettingsToggle,
  Divider,
  TextField,
  PhoneInput,
  showToast,
  Icon,
} from "@calcom/ui";

type AIEventControllerProps = {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
};

export default function AIEventController({ eventType, isTeamEvent }: AIEventControllerProps) {
  const { t } = useLocale();
  const session = useSession();
  const [aiEventState, setAIEventState] = useState<boolean>(eventType?.aiPhoneCallConfig?.enabled ?? true);
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

const TemplateFields = () => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { control, formState, watch } = formMethods;

  const templateType = watch("aiPhoneCallConfig.templateType");
  const fields = TEMPLATES_FIELDS[templateType];
  console.log("fields", fields);

  return fields?.map((field) => {
    return (
      <div key={field.name}>
        <Controller
          control={control}
          name={`aiPhoneCallConfig.${field.name}`}
          render={({ field: { value, onChange }, fieldState: { error } }) => {
            return (
              <div>
                <ComponentForField
                  field={{ ...field, label: t(field.defaultLabel) }}
                  value={value}
                  readOnly={false}
                  setValue={(val: unknown) => {
                    onChange(val);
                  }}
                />
                <ErrorMessage
                  name="responses"
                  errors={formState.errors}
                  render={({ message }: { message: string | undefined }) => {
                    message = message.replace(/\{[^}]+\}(.*)/, "$1").trim();
                    return (
                      <div
                        data-testid={`error-message-${field.name}`}
                        className="mt-2 flex items-center text-sm text-red-700 ">
                        <Icon name="info" className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
                        <p>{t(message || "invalid_input")}</p>
                      </div>
                    );
                  }}
                />
              </div>
            );
          }}
        />
      </div>
    );
  });
};

const AISettings = ({ eventType }: { eventType: EventTypeSetup }) => {
  const { t } = useLocale();

  const formMethods = useFormContext<FormValues>();
  const [calApiKey, setCalApiKey] = useState("");

  const createCallMutation = trpc.viewer.organizations.createPhoneCall.useMutation({
    onSuccess: (data) => {
      if (!!data?.call_id) {
        showToast("Phone Call Created successfully", "success");
      }
    },
    onError: (err) => {
      showToast(t("something_went_wrong"), "error");
    },
  });

  const handleSubmit = async () => {
    try {
      const values = formMethods.getValues("aiPhoneCallConfig");

      const data = await AIPhoneSettingSchema.parseAsync({
        generalPrompt: values.generalPrompt,
        beginMessage: values.beginMessage,
        enabled: values.enabled,
        guestName: values.guestName,
        guestEmail: values.guestEmail.trim().length ? values.guestEmail : undefined,
        guestCompany: values.guestCompany.trim().length ? values.guestCompany : undefined,
        eventTypeId: eventType.id,
        numberToCall: values.numberToCall,
        yourPhoneNumber: values.yourPhoneNumber,
        calApiKey,
      });

      createCallMutation.mutate(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldName = err.issues?.[0]?.path?.[0];
        const message = err.issues?.[0]?.message;
        showToast(`Error on ${fieldName}: ${message} `, "error");
      } else {
        showToast(t("something_went_wrong"), "error");
      }
    }
  };

  return (
    <div>
      <div className="space-y-4">
        <>
          <Label>{t("your_phone_number")}</Label>
          <Controller
            name="aiPhoneCallConfig.yourPhoneNumber"
            render={({ field: { onChange, value } }) => {
              return (
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
              );
            }}
          />

          <>
            <RadioGroup.Root
              defaultValue="CHECK_IN_APPPOINTMENT"
              onValueChange={(val) => {
                formMethods.setValue("aiPhoneCallConfig.templateType", val, { shouldDirty: true });
              }}>
              <div className="flex gap-2">
                <RadioGroup.Item
                  className="h-120 flex w-80 items-start rounded-lg border p-4"
                  key="CHECK_IN_APPPOINTMENT"
                  value="CHECK_IN_APPPOINTMENT">
                  <div>
                    <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />

                    <h2 className="font-semibold">Check-in Assistant</h2>
                    <p className="text-subtle mt-2">
                      Makes an outbound call to check if scheduled appointment works or if you want to
                      reschedule.
                    </p>
                  </div>
                </RadioGroup.Item>
                <RadioGroup.Item
                  className="flex h-80 w-80 items-start rounded-lg border p-4"
                  key="DENTIST_APPOINTMENT"
                  value="DENTIST_APPOINTMENT">
                  <div>
                    <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />

                    <h2 className="font-semibold">Dentist Receptionist</h2>
                    <p className="text-subtle mt-2">
                      Makes an outbound call to patients to reschedule their appointments.
                    </p>
                  </div>
                </RadioGroup.Item>
              </div>
            </RadioGroup.Root>
          </>

          <Label>{t("number_to_call")}</Label>
          <Controller
            name="aiPhoneCallConfig.numberToCall"
            render={({ field: { onChange, value } }) => {
              return (
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
              );
            }}
          />

          <TemplateFields />

          <Divider />
        </>

        {/* <TextField
          type="text"
          hint="Variable: {{name}}"
          label={t("guest_name")}
          placeholder="Jane Doe"
          {...formMethods.register("aiPhoneCallConfig.guestName")}
        />

        <TextField
          type="text"
          hint="Variable: {{email}}"
          label={t("guest_email")}
          placeholder="jane@acme.com"
          {...formMethods.register("aiPhoneCallConfig.guestEmail")}
        />

        <TextField
          type="text"
          hint="Variable: {{company}}"
          label={t("guest_company")}
          placeholder="Acme"
          {...formMethods.register("aiPhoneCallConfig.guestCompany")}
        /> */}

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
        {/* <TextAreaField
          rows={3}
          required
          placeholder={t("general_prompt")}
          label={t("general_prompt")}
          {...formMethods.register("aiPhoneCallConfig.generalPrompt")}
          onChange={(e) => {
            formMethods.setValue("aiPhoneCallConfig.generalPrompt", e.target.value, { shouldDirty: true });
          }}
        />

        <TextAreaField
          rows={3}
          placeholder={t("begin_message")}
          label={t("begin_message")}
          {...formMethods.register("aiPhoneCallConfig.beginMessage")}
          onChange={(e) => {
            formMethods.setValue("aiPhoneCallConfig.beginMessage", e.target.value, { shouldDirty: true });
          }}
        /> */}

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
