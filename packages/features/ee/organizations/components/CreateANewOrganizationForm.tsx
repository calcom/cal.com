import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button, Form, ImageUploader, TextField, Alert, Label, showToast } from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

import type { NewOrganizationFormValues } from "../lib/types";

const querySchema = z.object({
  returnTo: z.string(),
});

function extractDomainFromEmail(email: string) {
  let out = "";
  try {
    const match = email.match(/^(?:.*?:\/\/)?.*?(?<root>[\w\-]*(?:\.\w{2,}|\.\w{2,}\.\w{2}))(?:[\/?#:]|$)/);
    out = (match && match.groups?.root) ?? "";
  } catch (ignore) {}
  return out.split(".")[0];
}

export const CreateANewOrganizationForm = () => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const returnToParsed = querySchema.safeParse(router.query);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [showVerifyCode, setShowVerifyCode] = useState(false);
  const [inputCode, setInputCode] = useState("");

  const returnToParam =
    (returnToParsed.success ? getSafeRedirectUrl(returnToParsed.data.returnTo) : "/settings/organizations") ||
    "/settings/organizations";

  const newOrganizationFormMethods = useForm<NewOrganizationFormValues>();

  const createOrganizationMutation = trpc.viewer.organizations.create.useMutation({
    onSuccess: (data) => {
      telemetry.event(telemetryEventTypes.team_created);
      router.push(`/settings/organizations/${data.id}/onboard-members`);
    },
    onError: (err) => {
      if (err.message === "organization_url_taken") {
        newOrganizationFormMethods.setError("slug", { type: "custom", message: t("organization_url_taken") });
      } else {
        setServerErrorMessage(err.message);
      }
    },
  });

  const verifyEmailMutation = trpc.viewer.organizations.verifyEmail.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        setShowVerifyCode(true);
        showToast("Please check your email and enter the code we sent", "success");
      } else {
        //TODO
      }
    },
  });

  const verifyCodeMutation = trpc.viewer.organizations.verifyCode.useMutation({
    onSuccess: (ok) => {
      if (ok) {
        setEmailVerified(true);
        showToast("Email verified, please continue to next step", "success");
      } else {
        //TODO
      }
    },
    onError: (error) => {
      debugger;
    },
  });

  return (
    <>
      <Form
        form={newOrganizationFormMethods}
        handleSubmit={(v) => {
          if (!createOrganizationMutation.isLoading) {
            setServerErrorMessage(null);
            createOrganizationMutation.mutate(v);
          }
        }}>
        <div className="mb-5">
          {serverErrorMessage && (
            <div className="mb-4">
              <Alert severity="error" message={serverErrorMessage} />
            </div>
          )}

          <Controller
            name="admin.email"
            control={newOrganizationFormMethods.control}
            defaultValue=""
            rules={{
              required: t("must_enter_organization_admin_email"),
            }}
            render={({ field: { value } }) => (
              <div className="flex items-end gap-2">
                <TextField
                  className="rounded-r-none border-r-transparent"
                  containerClassName="w-4/5"
                  placeholder="john@acme.com"
                  name="admin.email"
                  label={t("admin_email")}
                  defaultValue={value}
                  addOnClassname="px-0"
                  addOnSuffix={
                    <Button
                      color="minimal"
                      className="hover:border-transparent hover:bg-transparent"
                      onClick={() => {
                        verifyEmailMutation.mutate({
                          email: newOrganizationFormMethods.getValues("admin.email"),
                          language: i18n.language,
                        });
                      }}>
                      Send code
                    </Button>
                  }
                  onChange={(e) => {
                    const domain = extractDomainFromEmail(e?.target.value);
                    newOrganizationFormMethods.setValue("admin.email", e?.target.value);
                    newOrganizationFormMethods.setValue("admin.username", e?.target.value.split("@")[0]);
                    newOrganizationFormMethods.setValue("slug", domain);
                    newOrganizationFormMethods.setValue(
                      "name",
                      domain.charAt(0).toUpperCase() + domain.slice(1)
                    );
                  }}
                  autoComplete="off"
                />
                <TextField
                  placeholder="123456"
                  className="rounded-r-none border-r-transparent"
                  addOnClassname="px-0"
                  required
                  onChange={(e) => {
                    setInputCode(e?.target.value);
                  }}
                  addOnSuffix={
                    <Button
                      color="minimal"
                      disabled={!showVerifyCode}
                      onClick={() => {
                        verifyCodeMutation.mutate({
                          code: inputCode,
                          email: newOrganizationFormMethods.getValues("admin.email"),
                        });
                      }}>
                      Verify code
                    </Button>
                  }
                />
              </div>
            )}
          />
        </div>
        <div className="mb-5">
          <Controller
            name="admin.username"
            control={newOrganizationFormMethods.control}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="slug"
                disabled
                label={t("admin_username")}
                placeholder="john"
                addOnLeading={`${
                  newOrganizationFormMethods.getValues("slug") ?? "acme"
                }.${process.env.NEXT_PUBLIC_WEBSITE_URL?.replace("https://", "")?.replace("http://", "")}/`}
                defaultValue={value}
                onChange={(e) => {
                  newOrganizationFormMethods.setValue("slug", slugify(e?.target.value), {
                    shouldTouch: true,
                  });
                  newOrganizationFormMethods.clearErrors("slug");
                }}
              />
            )}
          />
        </div>
        <div className="mb-5">
          <Controller
            name="name"
            control={newOrganizationFormMethods.control}
            defaultValue=""
            rules={{
              required: t("must_enter_organization_name"),
            }}
            render={({ field: { value } }) => (
              <>
                <TextField
                  className="mt-2"
                  placeholder="Acme"
                  name="name"
                  label={t("organization_name")}
                  defaultValue={value}
                  onChange={(e) => {
                    newOrganizationFormMethods.setValue("name", e?.target.value);
                    if (newOrganizationFormMethods.formState.touchedFields["slug"] === undefined) {
                      newOrganizationFormMethods.setValue("slug", slugify(e?.target.value));
                    }
                  }}
                  autoComplete="off"
                />
              </>
            )}
          />
        </div>

        <div className="mb-5">
          <Controller
            name="slug"
            control={newOrganizationFormMethods.control}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="slug"
                disabled
                label={t("organization_url")}
                placeholder="acme"
                addOnSuffix={`.${process.env.NEXT_PUBLIC_WEBSITE_URL?.replace("https://", "")?.replace(
                  "http://",
                  ""
                )}`}
                defaultValue={value}
                onChange={(e) => {
                  newOrganizationFormMethods.setValue("slug", slugify(e?.target.value), {
                    shouldTouch: true,
                  });
                  newOrganizationFormMethods.clearErrors("slug");
                }}
              />
            )}
          />
        </div>

        <div className="mb-5">
          <Controller
            control={newOrganizationFormMethods.control}
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
                        newOrganizationFormMethods.setValue("logo", newAvatar);
                        newOrganizationFormMethods.reset();
                      }}
                      imageSrc={value}
                    />
                  </div>
                </div>
              </>
            )}
          />
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            disabled={createOrganizationMutation.isLoading}
            color="secondary"
            href={returnToParam}
            className="w-full justify-center">
            {t("cancel")}
          </Button>
          <Button
            disabled={
              newOrganizationFormMethods.formState.isSubmitting ||
              createOrganizationMutation.isLoading ||
              !emailVerified
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
