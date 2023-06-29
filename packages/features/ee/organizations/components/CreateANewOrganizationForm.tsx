import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import useDigitInput from "react-digit-input";
import { Controller, useForm } from "react-hook-form";

import { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  TextField,
  Alert,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Label,
  Input,
} from "@calcom/ui";
import { ArrowRight, Info } from "@calcom/ui/components/icon";

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
}: {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  email: string;
  onSuccess: (isVerified: boolean) => void;
}) => {
  const { t } = useLocale();
  // Not using the mutation isLoading flag because after verifying we submit the underlying org creation form
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [value, onChange] = useState("");

  const digits = useDigitInput({
    acceptedCharacters: /^[0-9]$/,
    length: 6,
    value,
    onChange,
  });

  const verifyCodeMutation = trpc.viewer.organizations.verifyCode.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      onSuccess(data);
    },
    onError: (err) => {
      setIsLoading(false);
      if (err.message === "invalid_code") {
        setError(t("code_provided_invalid"));
      }
    },
  });

  const digitClassName = "h-12 w-12 !text-xl text-center";

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        onChange("");
        setError("");
        setIsOpenDialog(open);
      }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-row">
          <div className="w-full">
            <DialogHeader title={t("verify_your_email")} subtitle={t("enter_digit_code", { email })} />
            <Label htmlFor="code">{t("code")}</Label>
            <div className="flex flex-row justify-between">
              <Input
                className={digitClassName}
                name="2fa1"
                inputMode="decimal"
                {...digits[0]}
                autoFocus
                autoComplete="one-time-code"
              />
              <Input className={digitClassName} name="2fa2" inputMode="decimal" {...digits[1]} />
              <Input className={digitClassName} name="2fa3" inputMode="decimal" {...digits[2]} />
              <Input className={digitClassName} name="2fa4" inputMode="decimal" {...digits[3]} />
              <Input className={digitClassName} name="2fa5" inputMode="decimal" {...digits[4]} />
              <Input className={digitClassName} name="2fa6" inputMode="decimal" {...digits[5]} />
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-x-2 text-sm text-red-700">
                <div>
                  <Info className="h-3 w-3" />
                </div>
                <p>{error}</p>
              </div>
            )}
            <DialogFooter>
              <DialogClose />
              <Button
                disabled={isLoading}
                onClick={() => {
                  setError("");
                  if (value === "") {
                    setError("The code is a required field");
                  } else {
                    setIsLoading(true);
                    verifyCodeMutation.mutate({
                      code: value,
                      email,
                    });
                  }
                }}>
                {t("verify")}
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
  const { slug } = router.query;

  const newOrganizationFormMethods = useForm<{
    name: string;
    slug: string;
    adminEmail: string;
    adminUsername: string;
  }>({
    defaultValues: {
      slug: `${slug}`,
    },
  });
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
        newOrganizationFormMethods.setError("adminEmail", {
          type: "custom",
          message: t("email_already_used"),
        });
      } else if (err.message === "organization_url_taken") {
        newOrganizationFormMethods.setError("slug", { type: "custom", message: t("url_taken") });
      } else {
        setServerErrorMessage(err.message);
      }
    },
  });

  return (
    <>
      <Form
        form={newOrganizationFormMethods}
        id="createOrg"
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
                    if (newOrganizationFormMethods.getValues("slug") === "") {
                      newOrganizationFormMethods.setValue("slug", domain);
                    }
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
                addOnSuffix={`.${subdomainSuffix()}`}
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
            form="createOrg"
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
      <VerifyCodeDialog
        isOpenDialog={showVerifyCode}
        setIsOpenDialog={setShowVerifyCode}
        email={watchAdminEmail}
        onSuccess={(isVerified) => {
          if (isVerified) {
            createOrganizationMutation.mutate({
              ...newOrganizationFormMethods.getValues(),
              language: i18n.language,
              check: false,
            });
          }
        }}
      />
    </>
  );
};
