import { useSession } from "next-auth/react";
import Link from "next/link";
import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Alert,
  Button,
  Label,
  EmptyScreen,
  SettingsToggle,
  Dialog,
  DialogContent,
  SelectField,
  TextField,
  TextAreaField,
} from "@calcom/ui";
import { Sparkles, Phone, Plus } from "@calcom/ui/components/icon";

type AIEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  isTeamEvent: boolean;
};

export default function AIEventController({
  eventType,
  paymentEnabled,
  isTeamEvent,
}: AIEventControllerProps) {
  const { t } = useLocale();
  const session = useSession();
  const [aiEventState, setAIEventState] = useState<boolean>(eventType?.isAIEvent ?? false);
  const formMethods = useFormContext<FormValues>();

  //todo const isOrg = !!session.data?.user?.org?.id;
  const isOrg = true;

  if (session.status === "loading") return <></>;

  return (
    <LicenseRequired>
      <div className="block items-start sm:flex">
        {!isOrg || !isTeamEvent ? (
          <EmptyScreen
            headline={t("Cal.ai")}
            Icon={Sparkles}
            description={t(
              "Upgrade to Enterprise to generate an AI Agent phone number that can call guests to schedule calls" /*"uprade_to_create_instant_bookings" */
            )}
            buttonRaw={<Button href="/enterprise">{t("upgrade")}</Button>}
          />
        ) : (
          <div className={!paymentEnabled ? "w-full" : ""}>
            {paymentEnabled ? (
              <Alert severity="warning" title={t("warning_payment_instant_meeting_event")} />
            ) : (
              <>
                <SettingsToggle
                  labelClassName="text-sm"
                  toggleSwitchAtTheEnd={true}
                  switchContainerClassName={classNames(
                    "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                    aiEventState && "rounded-b-none"
                  )}
                  childrenClassName="lg:ml-0"
                  title={t("Cal.ai")}
                  description={t("Use Cal.ai to get an AI powered phone number or make calls to guests.")}
                  checked={aiEventState}
                  data-testid="instant-event-check"
                  onCheckedChange={(e) => {
                    if (!e) {
                      formMethods.setValue("isAIEvent", false, { shouldDirty: true });
                      setAIEventState(false);
                    } else {
                      formMethods.setValue("isAIEvent", true, { shouldDirty: true });
                      setAIEventState(true);
                    }
                  }}>
                  <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                    {aiEventState && <AISettings eventType={eventType} />}
                  </div>
                </SettingsToggle>
              </>
            )}
          </div>
        )}
      </div>
    </LicenseRequired>
  );
}

const AISettings = ({ eventType }: { eventType: EventTypeSetup }) => {
  const { t } = useLocale();
  console.log(eventType);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const NewPhoneButton = () => {
    const { t } = useLocale();
    return (
      <Button
        color="primary"
        data-testid="new_phone_number"
        StartIcon={Plus}
        onClick={() => setCreateModalOpen(true)}>
        {t("New Phone number")}
      </Button>
    );
  };

  // TODO: v2 will allow users to create phone numbers and agents within Cal.com.
  // we do this later, i just wanted to make the layout first
  const v1 = true;
  const v2 = true;
  const v3 = false;

  // v1 will require the user to log in to Retellai.com to create a phone number, and an agent and
  // authorize it with the Cal.com API key / OAuth
  const retellAuthorized = true; // TODO: call retellAPI here

  const numbers = [
    { value: 0, label: "+1" },
    { value: 1, label: "+49" },
    { value: 3, label: "+34" },
  ];

  return (
    <div>
      {retellAuthorized && (
        <>
          {/* TODO: <Form> */}
          <form className="space-y-4">
            {v1 && <SelectField label="Your phone number" options={numbers} />}
            {v1 && (
              <>
                <Label>Number to Call</Label>
                <TextField label="Number to Call" required placeholder="+1 234 456 789" />
              </>
            )}
            {v1 && (
              <>
                <Label>Guest Name</Label>
                <TextField label="Name of Receiver" required placeholder="Jane Doe" />
              </>
            )}
            {v2 && (
              <>
                <Label>Company</Label>
                <TextField label="Company" required placeholder="Company" />
              </>
            )}
            {v2 && (
              <>
                <Label>Script</Label>
                <TextAreaField
                  value="Introduce yourself: Hey, is this {firstname}? I am calling from Deel.com about your upcoming employee onboarding as an Intern at Cal.com. Peer, the Hiring Manager asked me to contact you because there are missing documents. Your task is to remind employees about missing documents and ask them politely to book a meeting. Ask if they need help and move forward with asking available times for an appointment with an onboarding specialist. It is ok if the person does not want a call. In that case remind them to log into the app.deel.com dashboard and follow all steps."
                  rows={5}
                  placeholder="Script"
                />
              </>
            )}
            {v2 && (
              <>
                <Label>Behaviour</Label>
                <TextAreaField
                  rows={8}
                  value="Make it very casual and breath and say umm and things that sound very natural. Communicate concisely and conversationally. Short sentences ideally less than 20 words and have enough breaks in between sentences. Your approach should be empathetic and understanding, balancing compassion with maintaining a professional stance on what is best for the employee. Be convincing. Really try hard to get a meeting. Be decisive but also polite.  It is ok if you don't get a meeting on your calendar. If someone asks if you are a robot, you say yes. Deel.com is using an automated voice agent to help, but all of our scheduled meetings are with real humans, pinky promise.
"
                />
              </>
            )}
            <div className="mb-4 flex gap-3">
              <Button>Make a Call</Button>
              {v2 && <Button color="secondary">{t("preview")}</Button>}
            </div>
            <small className="block opacity-60">
              Want to automate outgoing phone calls? Read our{" "}
              <Link className="underline" href="https://cal.com/docs">
                API docs
              </Link>{" "}
              and learn how to build workflows.
            </small>
          </form>
        </>
      )}

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
      )}
    </div>
  );
};
