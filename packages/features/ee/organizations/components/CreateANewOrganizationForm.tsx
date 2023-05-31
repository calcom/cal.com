import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  TextField,
  Alert,
  Label,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@calcom/ui";
import { ArrowRight } from "@calcom/ui/components/icon";

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

export const VerifyCodeDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  email,
  onSuccess,
  onError,
}: {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  email: string;
  onSuccess: () => void;
  onError?: () => void;
}) => {
  const { t } = useLocale();

  const [inputCode, setInputCode] = useState("");

  const verifyCodeMutation = trpc.viewer.organizations.verifyCode.useMutation({
    onSuccess,
    onError,
  });

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-row">
          <div className="w-full">
            <DialogHeader title="Verify your email" subtitle={`Enter the 6 digit code we sent to ${email}`} />
            <Label htmlFor="code">Code</Label>
            <TextField
              id="code"
              placeholder="123456"
              required
              onChange={(e) => {
                setInputCode(e?.target.value);
              }}
            />

            <DialogFooter>
              <DialogClose />
              <Button
                disabled={verifyCodeMutation.isLoading}
                onClick={() => {
                  verifyCodeMutation.mutate({
                    code: inputCode,
                    email,
                  });
                }}>
                Verify
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const CreateANewOrganizationForm = () => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const telemetry = useTelemetry();
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [showVerifyCode, setShowVerifyCode] = useState(false);

  const newOrganizationFormMethods = useForm<{
    name: string;
    slug: string;
    adminEmail: string;
    adminUsername: string;
  }>();
  const watchAdminEmail = newOrganizationFormMethods.watch("adminEmail");

  const createOrganizationMutation = trpc.viewer.organizations.create.useMutation({
    onSuccess: async (data) => {
      if (data.checked) {
        setShowVerifyCode(true);
      } else if (data.user) {
        telemetry.event(telemetryEventTypes.org_created);
        await signIn("credentials", {
          redirect: false,
          callbackUrl: "/",
          email: data.user.email,
          password: data.user.password,
        });
        router.push(`/settings/organizations/${data.user.organizationId}/set-password`);
      }
    },
    onError: (err) => {
      if (err.message === "admin_email_taken") {
        newOrganizationFormMethods.setError("adminEmail", { type: "custom", message: "Already being used" });
      } else {
        setServerErrorMessage(err.message);
      }
      if (err.message === "organization_url_taken") {
        newOrganizationFormMethods.setError("slug", { type: "custom", message: t("organization_url_taken") });
      } else {
        setServerErrorMessage(err.message);
      }
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
            name="adminEmail"
            control={newOrganizationFormMethods.control}
            defaultValue=""
            rules={{
              required: t("must_enter_organization_admin_email"),
            }}
            render={({ field: { value } }) => (
              <div className="flex">
                <TextField
                  containerClassName="w-full"
                  placeholder="john@acme.com"
                  name="adminEmail"
                  label={t("admin_email")}
                  defaultValue={value}
                  onChange={(e) => {
                    const domain = extractDomainFromEmail(e?.target.value);
                    newOrganizationFormMethods.setValue("adminEmail", e?.target.value);
                    newOrganizationFormMethods.setValue("adminUsername", e?.target.value.split("@")[0]);
                    newOrganizationFormMethods.setValue("slug", domain);
                    newOrganizationFormMethods.setValue(
                      "name",
                      domain.charAt(0).toUpperCase() + domain.slice(1)
                    );
                  }}
                  autoComplete="off"
                />
              </div>
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
            rules={{
              required: "Must enter organization slug",
            }}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="slug"
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

        <input hidden {...newOrganizationFormMethods.register("adminUsername")} />

        <div className="flex space-x-2 rtl:space-x-reverse">
          <Button
            disabled={
              newOrganizationFormMethods.formState.isSubmitting || createOrganizationMutation.isLoading
            }
            color="primary"
            EndIcon={ArrowRight}
            type="submit"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
      <VerifyCodeDialog
        isOpenDialog={showVerifyCode}
        setIsOpenDialog={setShowVerifyCode}
        email={watchAdminEmail}
        onSuccess={() => {
          createOrganizationMutation.mutate({
            ...newOrganizationFormMethods.getValues(),
            language: i18n.language,
            check: false,
          });
        }}
      />
    </>
  );
};
