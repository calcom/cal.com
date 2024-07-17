import { useSession } from "next-auth/react";
import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { z } from "zod";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
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
  TextAreaField,
  PhoneInput,
  showToast,
} from "@calcom/ui";

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

  // const [createModalOpen, setCreateModalOpen] = useState(false);

  // const NewPhoneButton = () => {
  //   const { t } = useLocale();
  //   return (
  //     <Button
  //       color="primary"
  //       data-testid="new_phone_number"
  //       StartIcon={Plus}
  //       onClick={() => setCreateModalOpen(true)}>
  //       {t("New Phone number")}
  //     </Button>
  //   );
  // };

  // v1 will require the user to log in to Retellai.com to create a phone number, and an agent and
  // authorize it with the Cal.com API key / OAuth
  // const retellAuthorized = true; // TODO: call retellAPI here

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

          <Divider />
        </>

        <TextField
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
        />

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
        <TextAreaField
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
        />

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

      {/* TODO:
        <>
          <EmptyScreen
            Icon={Phone}
            headline={t("Create your phone number")}
            description={t(
              "This phone number can be called by guests but can also do proactive outbound calls by the AI agent."
            )}
            buttonRaw={
              <div className="flex justify-between gap-2">
                <NewPhoneButton />
                <Button color="secondary">{t("learn_more")}</Button>
              </div>
            }
          />
          <Dialog open={createModalOpen} onOpenChange={(isOpen) => !isOpen && setCreateModalOpen(false)}>
            <DialogContent
              enableOverflow
              title={t("Create phone number")}
              description={t("This number can later be called or can do proactive outbound calls")}>
              <div className="mb-12 mt-4">
                <TextField placeholder="+415" hint="Area Code" />
              </div>
            </DialogContent>
          </Dialog>
        </>
      */}
    </div>
  );
};
