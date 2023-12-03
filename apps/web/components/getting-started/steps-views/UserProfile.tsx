import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import OrganizationMemberAvatar from "@calcom/features/ee/organizations/components/OrganizationMemberAvatar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import type { Ensure } from "@calcom/types/utils";
import { Button, Editor, ImageUploader, Label, showToast } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

type FormData = {
  bio: string;
  purpose: string;
};

const UserProfile = () => {
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const avatarRef = useRef<HTMLInputElement>(null);
  const { setValue, handleSubmit, getValues } = useForm<FormData>({
    defaultValues: {
      bio: user?.bio || "",
      purpose: "",
    },
  });

  const { data: eventTypes } = trpc.viewer.eventTypes.list.useQuery();
  const [imageSrc, setImageSrc] = useState<string>(user?.avatar || "");
  const utils = trpc.useContext();
  const router = useRouter();
  const createEventTypesWithCopilot = trpc.viewer.eventTypes.createCopilotSuggestion.useMutation();
  const telemetry = useTelemetry();
  const [firstRender, setFirstRender] = useState(true);

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (_data, context) => {
      if (context.avatar) {
        showToast(t("your_user_profile_updated_successfully"), "success");
        await utils.viewer.me.refetch();
      } else {
        try {
          if (eventTypes?.length === 0) {
            await new Promise((resolve, reject) => {
              createEventTypesWithCopilot.mutate(
                {
                  aboutMe: getValues("bio") || "",
                  aboutPeopleToMeet: getValues("purpose") || "",
                },
                {
                  onError: reject,
                  onSuccess: resolve,
                }
              );
            });
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
    const enteredAvatar = avatarRef.current?.value;
    mutation.mutate({
      avatar: enteredAvatar,
    });
  }

  const organization =
    user.organization && user.organization.id
      ? {
          ...(user.organization as Ensure<typeof user.organization, "id">),
          slug: user.organization.slug || null,
          requestedSlug: user.organization.metadata?.requestedSlug || null,
        }
      : null;
  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-row items-center justify-start rtl:justify-end">
        {user && (
          <OrganizationMemberAvatar size="lg" user={user} previewSrc={imageSrc} organization={organization} />
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
      <fieldset className="mt-8">
        <Label className="text-default mb-2 block text-sm font-medium">Who can book time with you?</Label>
        <Editor
          getText={() => md.render(getValues("purpose") || "")}
          setText={(value: string) => setValue("purpose", turndown(value))}
          excludedToolbarItems={["blockType"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
        <p className="dark:text-inverted text-default mt-2 font-sans text-sm font-normal">
          Tell us a bit about who you want to meet, and we&apos;ll set up your calendar accordingly.
        </p>
      </fieldset>
      <Button
        type="submit"
        loading={createEventTypesWithCopilot.isLoading || mutation.isLoading}
        className="text-inverted mt-8 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-sm">
        {t("finish")}
        <ArrowRight className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </Button>
    </form>
  );
};

export default UserProfile;
