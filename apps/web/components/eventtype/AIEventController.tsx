import { useSession } from "next-auth/react";
import Link from "next/link";
import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
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
import { Sparkles } from "@calcom/ui/components/icon";

type AIEventControllerProps = {
  eventType: EventTypeSetup;
  isTeamEvent: boolean;
};

export default function AIEventController({ eventType, isTeamEvent }: AIEventControllerProps) {
  const { t } = useLocale();
  const session = useSession();
  const [aiEventState, setAIEventState] = useState<boolean>(eventType?.isCalAiPhoneCallEnabled ?? false);
  const formMethods = useFormContext<FormValues>();

  const isOrg = !!session.data?.user?.org?.id;

  if (session.status === "loading") return <></>;

  return (
    <LicenseRequired>
      <div className="block items-start sm:flex">
        {!isOrg || !isTeamEvent ? (
          <EmptyScreen
            headline={t("Cal.ai")}
            Icon={Sparkles}
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
                  formMethods.setValue("isCalAiPhoneCallEnabled", false, { shouldDirty: true });
                  setAIEventState(false);
                } else {
                  formMethods.setValue("isCalAiPhoneCallEnabled", true, { shouldDirty: true });
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
  const [numberToCall, setNumberToCall] = useState();
  const [yourPhoneNumber, setYourPhoneNumber] = useState();
  const [guestName, setGuestName] = useState();

  const formMethods = useFormContext<FormValues>();

  const calAiPhoneScript = formMethods.watch("calAiPhoneScript");
  const createCallMutation = trpc.viewer.organizations.createPhoneCall.useMutation({
    onSuccess: (data) => {
      if (!!data?.call_id) {
        showToast("Phone Call Created successfully", "success");
      }
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
      const data = await AIPhoneSettingSchema.parseAsync({
        yourPhoneNumber,
        calAiPhoneScript,
        guestName,
        numberToCall,
      });

      createCallMutation.mutate(data);
    } catch (err) {
      console.log("erer", err.issues[0]);
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
          <PhoneInput
            required
            placeholder={t("your_phone_number")}
            id="yourPhoneNumber"
            value={yourPhoneNumber}
            onChange={(val) => {
              setYourPhoneNumber(val);
            }}
          />

          <Label>{t("number_to_call")}</Label>
          <PhoneInput
            required
            placeholder={t("phone_number")}
            id="numberToCall"
            value={numberToCall}
            onChange={(val) => {
              setNumberToCall(val);
            }}
          />

          <Divider />
        </>

        <Label>{t("guest_name")}</Label>
        <TextField
          type="text"
          hint="Variable: {name}"
          label={t("guest_name")}
          placeholder="Jane Doe"
          value={guestName}
          required
          onChange={(e) => {
            setGuestName(e.target.value);
          }}
        />

        <Divider />
        <TextAreaField
          rows={3}
          required
          placeholder="Script"
          name="calAiPhoneScript"
          label="script"
          {...formMethods.register("calAiPhoneScript")}
          onChange={(e) => {
            formMethods.setValue("calAiPhoneScript", e.taget.value, { shouldDirty: true });
          }}
        />

        {/*  Peer's comments here */}
        {/* // TODO: v2 will allow users to create phone numbers and agents within Cal.com.
            // we do this later, i just wanted to make the layout first
            */}
        {/* {v2 && (
              <>
                <Label>Guest Email</Label>
                <TextField
                  hint="Variable: {email}"
                  label="Email of Guest"
                  required
                  placeholder="jane@example.com"
                />
              </>
            )} */}

        {/* {v2 && (
              <>
                <TextAreaField
                  rows={3}
                  value="Make it very casual and breath and say umm and things that sound very natural. Communicate concisely and conversationally. Short sentences ideally less than 20 words and have enough breaks in between sentences. Your approach should be empathetic and understanding, balancing compassion with maintaining a professional stance on what is best for the employee. Be convincing. Really try hard to get a meeting. Be decisive but also polite.  It is ok if you don't get a meeting on your calendar. If someone asks if you are a robot, you say yes. Deel.com is using an automated voice agent to help, but all of our scheduled meetings are with real humans, pinky promise."
                  name="Behaviour"
                />
              </>
            )} */}

        <Button disabled={createCallMutation.isPending} onClick={handleSubmit}>
          Make a Call
        </Button>

        <small className="block opacity-60">
          Want to automate outgoing phone calls? Read our{" "}
          <Link className="underline" href="https://cal.com/docs">
            API docs
          </Link>{" "}
          and learn how to build workflows.
        </small>
      </div>

      {/*
      {v3 && (
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
      )} */}
    </div>
  );
};
