"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { trpc } from "@calcom/trpc/react";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Editor } from "@calcom/ui/components/editor";
import { Label } from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { showToast } from "@calcom/ui/components/toast";

import { UsernameAvailabilityField } from "@components/ui/UsernameAvailability";

import { OnboardingCard } from "../_components/OnboardingCard";
import { OnboardingLayout } from "../_components/OnboardingLayout";
import { useOnboardingStore } from "../../store/onboarding-store";

type PersonalProfileViewProps = {
  userEmail: string;
};

type FormData = {
  bio: string;
};

export const PersonalProfileView = ({ userEmail }: PersonalProfileViewProps) => {
  const { data: user } = trpc.viewer.me.get.useQuery();
  const router = useRouter();
  const { t } = useLocale();
  const { personalDetails, setPersonalDetails } = useOnboardingStore();

  const avatarRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [firstRender, setFirstRender] = useState(true);

  // Update imageSrc when user loads
  useEffect(() => {
    if (user) {
      setImageSrc(personalDetails.avatar || user.avatar || "");
    }
  }, [user, personalDetails.avatar]);

  const { setValue, handleSubmit, getValues } = useForm<FormData>({
    defaultValues: { bio: personalDetails.bio || user?.bio || "" },
  });

  const utils = trpc.useUtils();

  // Avatar mutation
  const avatarMutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (data) => {
      showToast(t("your_user_profile_updated_successfully"), "success");
      setImageSrc(data.avatarUrl ?? "");
      setPersonalDetails({ avatar: data.avatarUrl ?? null });
    },
    onError: () => {
      showToast(t("problem_saving_user_profile"), "error");
    },
  });

  // Profile mutation
  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
    },
  });

  const onSubmit = handleSubmit(async (data: { bio: string }) => {
    const { bio } = data;

    // Save to store
    setPersonalDetails({
      bio,
    });

    // Save to backend
    await mutation.mutateAsync({
      bio,
    });

    router.push("/onboarding/personal/calendar");
  });

  async function updateProfileHandler(newAvatar: string) {
    avatarMutation.mutate({
      avatarUrl: newAvatar,
    });
  }

  if (!user) {
    return null;
  }

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={2}>
      <OnboardingCard
        title={t("complete_your_profile")}
        subtitle={t("personal_profile_subtitle")}
        footer={
          <Button
            color="primary"
            className="rounded-[10px]"
            onClick={onSubmit}
            loading={mutation.isPending}
            disabled={mutation.isPending}>
            {t("continue")}
          </Button>
        }>
        {/* Form */}
        <div className="bg-default border-muted w-full rounded-[10px] border">
          <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
            <div className="flex w-full flex-col items-start">
              <form onSubmit={onSubmit} className="flex w-full gap-6 px-5 py-5">
                <div className="flex w-full flex-col gap-6 rounded-xl">
                  {/* Avatar */}
                  <div className="flex w-full flex-col gap-2">
                    <Label className="text-emphasis text-sm font-medium leading-4">{t("profile_photo")}</Label>
                    <div className="flex flex-row items-center justify-start gap-4 rtl:justify-end">
                      {user && <UserAvatar size="lg" user={user} previewSrc={imageSrc} />}
                      <input
                        ref={avatarRef}
                        type="hidden"
                        name="avatar"
                        id="avatar"
                        defaultValue={imageSrc}
                      />
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
                          updateProfileHandler(newAvatar);
                        }}
                        imageSrc={imageSrc}
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div className="flex w-full flex-col gap-1.5">
                    <UsernameAvailabilityField />
                  </div>

                  {/* Bio */}
                  <div className="flex w-full flex-col gap-1.5">
                    <Label className="text-emphasis mb-1 text-sm font-medium leading-4">{t("about")}</Label>
                    <Editor
                      getText={() => md.render(getValues("bio") || user?.bio || "")}
                      setText={(value: string) => setValue("bio", turndown(value))}
                      excludedToolbarItems={["blockType"]}
                      firstRender={firstRender}
                      setFirstRender={setFirstRender}
                    />
                    <p className="text-subtle text-xs font-normal leading-3">
                      {t("few_sentences_about_yourself")}
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </OnboardingCard>
    </OnboardingLayout>
  );
};
