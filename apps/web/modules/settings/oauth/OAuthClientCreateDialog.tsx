"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import type { OAuthClientDetails } from "./OAuthClientDetailsDialog";
import { OAuthClientFormFields } from "./OAuthClientFormFields";

export type OAuthClientCreateFormValues = {
  name: string;
  purpose: string;
  redirectUri: string;
  websiteUrl: string;
  logo: string;
  enablePkce: boolean;
};

export const OAuthClientCreateDialog = ({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  onSubmit,
  resultClient,
  resultTitle,
  resultDescription,
  clientSecretInfoKey,
  onClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: OAuthClientCreateFormValues) => void;
  resultClient: OAuthClientDetails | null;
  resultTitle: string;
  resultDescription?: string;
  clientSecretInfoKey?: string;
  onClose: () => void;
}) => {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();
  const [logo, setLogo] = useState("");

  const form = useForm<OAuthClientCreateFormValues>({
    defaultValues: {
      name: "",
      purpose: "",
      redirectUri: "",
      websiteUrl: "",
      logo: "",
      enablePkce: false,
    },
  });

  const handleClose = () => {
    onClose();
    setLogo("");
    form.reset();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        enableOverflow
        type="creation"
        title={
          resultClient ? (
            <>
              {resultClient.approvalStatus === "PENDING" ? (
                <span className="mb-2 flex items-center justify-start">
                  <Badge variant="orange">{t("pending")}</Badge>
                </span>
              ) : null}
              <span>{resultTitle}</span>
            </>
          ) : (
            title
          )
        }
        description={resultClient ? resultDescription : description}>
        {!resultClient ? (
          <Form
            form={form}
            handleSubmit={(values) => {
              onSubmit({
                name: values.name.trim() || "",
                purpose: values.purpose.trim() || "",
                redirectUri: values.redirectUri.trim() || "",
                websiteUrl: values.websiteUrl.trim() || "",
                logo: values.logo,
                enablePkce: values.enablePkce,
              });
            }}
            className="space-y-4">
            <OAuthClientFormFields form={form} logo={logo} setLogo={setLogo} />

            <DialogFooter>
              <DialogClose>{t("close")}</DialogClose>
              <Button type="submit" loading={isSubmitting}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </Form>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <div className="text-subtle mb-1 text-sm">{t("client_name")}</div>
                <div className="text-emphasis font-medium">{resultClient.name}</div>
              </div>

              <div>
                <div className="text-subtle mb-1 text-sm">{t("client_id")}</div>
                <div className="flex">
                  <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                    {resultClient.clientId}
                  </code>
                  <Tooltip side="top" content={t("copy_to_clipboard")}>
                    <Button
                      onClick={() => {
                        copyToClipboard(resultClient.clientId, {
                          onSuccess: () => showToast(t("client_id_copied"), "success"),
                          onFailure: () => showToast(t("error"), "error"),
                        });
                      }}
                      type="button"
                      size="sm"
                      className="rounded-l-none"
                      StartIcon="clipboard">
                      {t("copy")}
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {resultClient.clientSecret ? (
                <div>
                  <div className="text-subtle mb-1 text-sm">{t("client_secret")}</div>
                  <div className="flex">
                    <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                      {resultClient.clientSecret}
                    </code>
                    <Tooltip side="top" content={t("copy_to_clipboard")}>
                      <Button
                        onClick={() => {
                          copyToClipboard(resultClient.clientSecret ?? "", {
                            onSuccess: () => showToast(t("client_secret_copied"), "success"),
                            onFailure: () => showToast(t("error"), "error"),
                          });
                        }}
                        type="button"
                        size="sm"
                        className="rounded-l-none"
                        StartIcon="clipboard">
                        {t("copy")}
                      </Button>
                    </Tooltip>
                  </div>
                  <Alert
                    severity="warning"
                    message={t(clientSecretInfoKey ?? "oauth_client_client_secret_one_time_warning")}
                    className="mt-3"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" onClick={handleClose}>
                {t("done")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
