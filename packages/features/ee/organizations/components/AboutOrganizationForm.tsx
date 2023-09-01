import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import { Alert, Avatar, Button, Form, ImageUploader, Label, TextAreaField } from "@calcom/ui";
import { ArrowRight, Plus } from "@calcom/ui/components/icon";

const querySchema = z.object({
  id: z.string(),
});

export const AboutOrganizationForm = () => {
  const { t } = useLocale();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const { id: orgId } = querySchema.parse(routerQuery);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [image, setImage] = useState("");

  const aboutOrganizationFormMethods = useForm<{
    logo: string;
    bio: string;
  }>();

  const updateOrganizationMutation = trpc.viewer.organizations.update.useMutation({
    onSuccess: (data) => {
      if (data.update) {
        router.push(`/settings/organizations/${orgId}/onboard-admins`);
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
        className="space-y-5"
        handleSubmit={(v) => {
          if (!updateOrganizationMutation.isLoading) {
            setServerErrorMessage(null);
            updateOrganizationMutation.mutate({ ...v, orgId });
          }
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
                    fallback={<Plus className="text-subtle h-6 w-6" />}
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
