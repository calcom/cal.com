"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { useOnboarding } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { TextAreaField } from "@calcom/ui/components/form";
import { Form } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { ImageUploader } from "@calcom/ui/components/image-uploader";

export const AboutOrganizationForm = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { useOnboardingStore } = useOnboarding();
  const { setLogo, setBio, bio: bioFromStore, logo: logoFromStore } = useOnboardingStore();

  const aboutOrganizationFormMethods = useForm<{
    logo: string;
    bio: string;
  }>({
    defaultValues: {
      logo: logoFromStore ?? "",
      bio: bioFromStore ?? "",
    },
  });

  return (
    <>
      <Form
        form={aboutOrganizationFormMethods}
        className="space-y-5"
        handleSubmit={(values) => {
          setLogo(values.logo);
          setBio(values.bio);
          router.push(`/settings/organizations/new/add-teams`);
        }}>
        <div>
          <Controller
            control={aboutOrganizationFormMethods.control}
            name="logo"
            render={({ field: { value } }) => (
              <>
                <Label>{t("organization_logo")}</Label>
                <div className="flex items-center">
                  <Avatar
                    alt=""
                    fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
                    className="items-center"
                    imageSrc={value}
                    size="lg"
                  />
                  <div className="ms-4">
                    <ImageUploader
                      target="avatar"
                      id="avatar-upload"
                      buttonMsg={t("upload")}
                      handleAvatarChange={(newAvatar: string) => {
                        aboutOrganizationFormMethods.setValue("logo", newAvatar);
                      }}
                      imageSrc={value}
                      translations={{
                        upload_target: t("upload_target"),
                        no_target: t("no_target"),
                        slide_zoom_drag_instructions: t("slide_zoom_drag_instructions"),
                        image_size_limit_exceed: t("image_size_limit_exceed"),
                        upload_image: t("upload_image"),
                        choose_a_file: t("choose_a_file"),
                        cancel: t("cancel"),
                        save: t("save"),
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          />
        </div>

        <div>
          <Controller
            control={aboutOrganizationFormMethods.control}
            name="bio"
            render={({ field: { value } }) => (
              <>
                <TextAreaField
                  name="about"
                  defaultValue={value}
                  onChange={(e) => {
                    aboutOrganizationFormMethods.setValue("bio", e?.target.value);
                  }}
                />
                <p className="text-subtle text-sm">{t("organization_about_description")}</p>
              </>
            )}
          />
        </div>

        <div className="flex">
          <Button
            // Form submitted means navigation is happening and new Form would render when that occurs, so keep it in loading state
            loading={aboutOrganizationFormMethods.formState.isSubmitted}
            color="primary"
            EndIcon="arrow-right"
            type="submit"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};
