import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";

import OrganizationAvatar from "@calcom/features/ee/organizations/components/OrganizationAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import { Button, Editor, ImageUploader, Input, InputField, Label, showToast } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

type FormData = {
  bio: string;
  linkedin: string;
  title: string;
  company: string;
};

const UserProfile = () => {
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const avatarRef = useRef<HTMLInputElement>(null);
  const { setValue, handleSubmit, getValues } = useForm<FormData>({
    defaultValues: { bio: user?.bio || "" },
  });

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const [imageSrc, setImageSrc] = useState<string>(user?.avatar || "");
  const utils = trpc.useContext();
  const router = useRouter();
  const createEventType = trpc.viewer.eventTypes.create.useMutation();
  const telemetry = useTelemetry();
  const [firstRender, setFirstRender] = useState(true);
  const linkedInProfileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
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
    const linkedInProfileValue = linkedInProfileRef.current?.value;
    const titleValue = titleRef.current?.value;
    const companyValue = companyRef.current?.value;

    if (!linkedInProfileValue || !titleValue) {
      showToast(t("Please fill the Linkedin Profile url and Title."), "error");
      return;
    }
    telemetry.event(telemetryEventTypes.onboardingFinished);
    mutation.mutate({
      bio,
      linkedin: linkedInProfileValue,
      title: titleValue,
      company: companyValue,
      completedOnboarding: true,
    });
  });

  async function updateProfileHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredAvatar = avatarRef.current?.value;
    mutation.mutate({
      avatar: enteredAvatar,
    });
  }

  const DEFAULT_EVENT_TYPES = [
    {
      title: t("15min_meeting"),
      slug: "15min",
      length: 15,
      ques: "Event Questions",
      amount: 100,
    },
    {
      title: t("30min_meeting"),
      slug: "30min",
      length: 30,
      ques: "Event Questions",
      amount: 100,
    },
    {
      title: t("secret_meeting"),
      slug: "secret",
      length: 15,
      hidden: true,
      ques: "Event Questions",
      amount: 100,
    },
  ];

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-row items-center justify-start rtl:justify-end">
        {user && (
          <OrganizationAvatar
            alt={user.username || "user avatar"}
            size="lg"
            imageSrc={imageSrc}
            organizationSlug={user.organization?.slug}
          />
        )}
        <input
          ref={avatarRef}
          type="hidden"
          name="avatar"
          id="avatar"
          placeholder="URL"
          className="border-default focus:ring-empthasis mt-1 block w-full rounded-sm border px-3 py-2 text-sm focus:border-gray-800 focus:outline-none"
          defaultValue={imageSrc}
        />
        <div className="flex items-center px-4">
          <ImageUploader
            target="avatar"
            id="avatar-upload"
            buttonMsg={t("add_profile_photo")}
            handleAvatarChange={(newAvatar) => {
              if (avatarRef.current) {
                avatarRef.current.value = newAvatar;
              }
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              )?.set;
              nativeInputValueSetter?.call(avatarRef.current, newAvatar);
              const ev2 = new Event("input", { bubbles: true });
              avatarRef.current?.dispatchEvent(ev2);
              updateProfileHandler(ev2 as unknown as FormEvent<HTMLFormElement>);
              setImageSrc(newAvatar);
            }}
            imageSrc={imageSrc}
          />
        </div>
      </div>

      <fieldset className="mt-8">
        <Label className="text-default mb-2 block text-sm font-medium">{t("LinkedIn Profile")}</Label>
        <InputField addOnLeading={<>https://linkedin.com/</>} ref={linkedInProfileRef} />
      </fieldset>
      <fieldset className="mt-8 flex justify-between">
        <div className="w-[45%]">
          <Label className="text-default mb-2 block text-sm font-medium">{t("Title")}</Label>
          <Input ref={titleRef} placeholder="CEO" />
        </div>
        <div className="w-[45%]">
          <Label className="text-default mb-2 block text-sm font-medium">{t("Company")}</Label>
          <Input ref={companyRef} placeholder="Abc Inc." />
        </div>
      </fieldset>
      <fieldset className="mt-8">
        <Label className="text-default mb-2 block text-sm font-medium">{t("about")}</Label>
        <Editor
          getText={() => md.render(getValues("bio") || user?.bio || "")}
          setText={(value: string) => setValue("bio", turndown(value))}
          excludedToolbarItems={["blockType"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
        <p className="dark:text-inverted text-default mt-2 font-sans text-sm font-normal">
          {t("few_sentences_about_yourself")}
        </p>
      </fieldset>
      <Button
        type="submit"
        className="text-inverted mt-8 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-sm">
        {t("finish")}
        <ArrowRight className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
      <Toaster position="bottom-right" />
    </form>
  );
};

export default UserProfile;
