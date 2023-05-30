import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button, Form, ImageUploader, Alert, Label, TextAreaField } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

export const AboutOrganizationForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const { id: orgId } = router.query;
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);

  const aboutOrganizationFormMethods = useForm<{
    logo: string;
    bio: string;
  }>();

  const updateOrganizationMutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: (data) => {
      if (data.update) {
        router.push(`/settings/organizations/${data.user.org}/set-password`);
      }
    },
    onError: (err) => {
      setServerErrorMessage(err.message);
    },
  });

  return (
    <>
      <Form
        form={aboutOrganizationFormMethods}
        handleSubmit={(v) => {
          if (!updateOrganizationMutation.isLoading) {
            setServerErrorMessage(null);
            updateOrganizationMutation.mutate({ ...v, orgId });
          }
        }}>
        <div className="mb-5">
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}
        </div>

        <div className="mb-5">
          <Controller
            control={aboutOrganizationFormMethods.control}
            name="logo"
            render={({ field: { value } }) => (
              <>
                <Label>Organization Logo</Label>
                <div className="flex items-center">
                  <Avatar alt="" imageSrc={value || null} gravatarFallbackMd5="newTeam" size="lg" />
                  <div className="ms-4">
                    <ImageUploader
                      target="avatar"
                      id="avatar-upload"
                      buttonMsg={t("update")}
                      handleAvatarChange={(newAvatar: string) => {
                        debugger;
                        aboutOrganizationFormMethods.setValue("logo", newAvatar);
                        aboutOrganizationFormMethods.reset();
                      }}
                      imageSrc={value}
                    />
                  </div>
                </div>
              </>
            )}
          />
        </div>

        <div className="mb-5">
          <Controller
            control={aboutOrganizationFormMethods.control}
            name="bio"
            render={({ field: { value } }) => (
              <TextAreaField
                name="bio"
                defaultValue={value}
                onChange={(e) => {
                  aboutOrganizationFormMethods.setValue("bio", e?.target.value);
                }}
              />
            )}
          />
        </div>

        <div className="flex">
          <Button
            disabled={
              aboutOrganizationFormMethods.formState.isSubmitting || updateOrganizationMutation.isLoading
            }
            color="primary"
            EndIcon={ArrowRight}
            type="submit"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};
