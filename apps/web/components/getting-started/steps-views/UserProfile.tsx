import { ArrowRightIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import { Button, Editor, ImageUploader, Label, showToast } from "@calcom/ui";
import { Avatar } from "@calcom/ui";

import type { IOnboardingPageProps } from "../../../pages/getting-started/[[...step]]";

type FormData = {
  bio: string;
};
interface IUserProfileProps {
  user: IOnboardingPageProps["user"];
}

const UserProfile = (props: IUserProfileProps) => {
  const { user } = props;
  const { t } = useLocale();
  const avatarRef = useRef<HTMLInputElement>(null!);
  const { setValue, handleSubmit, getValues } = useForm<FormData>({
    defaultValues: { bio: user?.bio || "" },
  });

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const [imageSrc, setImageSrc] = useState<string>(user?.avatar || "");
  const utils = trpc.useContext();
  const router = useRouter();
  const createEventType = trpc.viewer.eventTypes.create.useMutation();
  const telemetry = useTelemetry();

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (_data, context) => {
      if (context.avatar) {
        showToast(t("your_user_profile_updated_successfully"), "success");
        await utils.viewer.me.refetch();
      } else {
        try {
          if (eventTypes?.length === 0) {
            await Promise.all(
              DEFAULT_EVENT_TYPES.map(async (event) => {
                return createEventType.mutate(event);
              })
            );
          }
        } catch (error) {
          console.error(error);
        }

        await utils.viewer.me.refetch();
        router.push("/");
      }
    },
    onError: () => {
      showToast(t("problem_saving_user_profile"), "error");
    },
  });
  const onSubmit = handleSubmit((data: { bio: string }) => {
    const { bio } = data;

    telemetry.event(telemetryEventTypes.onboardingFinished);

    mutation.mutate({
      bio,
      completedOnboarding: true,
    });
  });

  async function updateProfileHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredAvatar = avatarRef.current.value;
    mutation.mutate({
      avatar: enteredAvatar,
    });
  }

  const DEFAULT_EVENT_TYPES = [
    {
      title: "Start Bi-Weekly Coaching",
      slug: "bi-weekly-start-coaching-session",
      eventName: "{ATTENDEE} & {HOST} | Mento Bi-Weekly Coaching",
      description:
        "Choose a time that works for you every two weeks. You'll get the first invite right-away and a complete schedule confirmed soon after.",
      locations: [{ type: "integrations:google:meet" }],
      length: 45,
      hidden: false,
      afterEventBuffer: 15,
      minimumBookingNotice: 1440,
      slotInterval: 30,
    },
    {
      title: "Single Coaching Session",
      slug: "single-coaching-session",
      eventName: "{ATTENDEE} & {HOST} | Mento Coaching Session",
      description: "Please use this to book one-time and make up sessions when necessary.",
      locations: [{ type: "integrations:google:meet" }],
      length: 45,
      hidden: false,
      afterEventBuffer: 15,
      minimumBookingNotice: 1440,
      slotInterval: 30,
    },
    {
      title: "Bi-Weekly Coaching session",
      slug: "bi-weekly-coaching-session",
      eventName: "{ATTENDEE} & {HOST} | Mento Bi-Weekly Coaching",
      description: "Set up your ongoing Mento Coaching schedule (45 minutes every two weeks).",
      locations: [{ type: "integrations:google:meet" }],
      recurringEvent: { freq: 2, count: 24, interval: 2 },
      length: 45,
      hidden: true,
      afterEventBuffer: 15,
      minimumBookingNotice: 1440,
      slotInterval: 30,
    },
  ];

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-row items-center justify-start rtl:justify-end">
        {user && (
          <Avatar
            alt={user.username || "user avatar"}
            gravatarFallbackMd5={user.emailMd5}
            size="lg"
            imageSrc={imageSrc}
          />
        )}
        <input
          ref={avatarRef}
          type="hidden"
          name="avatar"
          id="avatar"
          placeholder="URL"
          className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 text-sm focus:border-gray-800 focus:outline-none focus:ring-gray-800"
          defaultValue={imageSrc}
        />
        <div className="flex items-center px-4">
          <ImageUploader
            target="avatar"
            id="avatar-upload"
            buttonMsg={t("add_profile_photo")}
            handleAvatarChange={(newAvatar) => {
              avatarRef.current.value = newAvatar;
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              )?.set;
              nativeInputValueSetter?.call(avatarRef.current, newAvatar);
              const ev2 = new Event("input", { bubbles: true });
              avatarRef.current.dispatchEvent(ev2);
              updateProfileHandler(ev2 as unknown as FormEvent<HTMLFormElement>);
              setImageSrc(newAvatar);
            }}
            imageSrc={imageSrc}
          />
        </div>
      </div>
      <fieldset className="mt-8">
        <Label className="mb-2 block text-sm font-medium text-gray-700">{t("about")}</Label>
        <Editor
          getText={() => md.render(getValues("bio") || user?.bio || "")}
          setText={(value: string) => setValue("bio", turndown(value))}
          excludedToolbarItems={["blockType"]}
        />
        <p className="mt-2 font-sans text-sm font-normal text-gray-600 dark:text-white">
          {t("few_sentences_about_yourself")}
        </p>
      </fieldset>
      <Button type="submit" className="mt-8 flex w-full flex-row justify-center">
        {t("finish")}
        <ArrowRightIcon className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export default UserProfile;
