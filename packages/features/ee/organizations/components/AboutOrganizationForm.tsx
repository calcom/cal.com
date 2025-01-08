"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useOnboardingStore } from "@calcom/features/ee/organizations/lib/onboardingStore";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Avatar, Button, Form, Icon, ImageUploader, Label, TextAreaField } from "@calcom/ui";

export const AboutOrganizationForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [image, setImage] = useState("");

  const { setLogo, setBio } = useOnboardingStore();

  const aboutOrganizationFormMethods = useForm<{
    logo: string;
    bio: string;
  }>();

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
        {serverErrorMessage && (
          <div>
            <Alert severity="error" message={serverErrorMessage} />
          </div>
        )}

        <div>
          <Controller
            control={aboutOrganizationFormMethods.control}
            name="logo"
            render={() => (
              <>
                <Label>{t("organization_logo")}</Label>
                <div className="flex items-center">
                  <Avatar
                    alt=""
                    fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
                    className="items-center"
                    imageSrc={image}
                    size="lg"
                  />
                  <div className="ms-4">
                    <ImageUploader
                      target="avatar"
                      id="avatar-upload"
                      buttonMsg={t("upload")}
                      handleAvatarChange={(newAvatar: string) => {
                        setImage(newAvatar);
                        aboutOrganizationFormMethods.setValue("logo", newAvatar);
                      }}
                      imageSrc={image}
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
            disabled={aboutOrganizationFormMethods.formState.isSubmitting}
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
