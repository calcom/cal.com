"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { OAuthClientResultDialog } from "./OAuthClientResultDialog";
import type { OAuthClientDetails } from "./OAuthClientDetailsDialog";
import { OAuthClientFormFields } from "./OAuthClientFormFields";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Form } from "@calcom/ui/components/form";

export type OAuthClientCreateFormValues = {
  name: string;
  purpose: string;
  redirectUri: string;
  websiteUrl: string;
  logo: string;
  enablePkce: boolean;
};

type BaseOAuthClientCreateDialogContentProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: OAuthClientCreateFormValues) => void;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
};

export type OAuthClientCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: OAuthClientCreateFormValues) => void;
  resultClient: OAuthClientDetails | null;
  clientSecretInfoKey?: string;
  onClose: () => void;
};

export function OAuthClientCreateDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
  resultClient,
  clientSecretInfoKey,
  onClose,
}: OAuthClientCreateDialogProps) {
  const { t } = useLocale();

  if (resultClient) {
    return (
      <OAuthClientResultDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t("oauth_client_submitted")}
        description={t("oauth_client_submitted_description")}
        resultClient={resultClient}
        clientSecretInfoKey={clientSecretInfoKey}
        onClose={onClose}
      />
    );
  }

  return (
    <OAuthClientCreateDialogContent
      open={open}
      onOpenChange={onOpenChange}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
      onClose={onClose}
      title={t("create_oauth_client")}
      description={t("create_oauth_client_description")}
      submitLabel={t("create")}
    />
  );
}

export function OAuthClientCreateDialogContent({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
  onClose,
  title,
  description,
  submitLabel,
}: BaseOAuthClientCreateDialogContentProps) {
  const { t } = useLocale();
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
      <DialogContent enableOverflow type="creation" title={title} description={description}>
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
          className="space-y-4"
          data-testid="oauth-client-create-form">
          <OAuthClientFormFields form={form} logo={logo} setLogo={setLogo} />

          <DialogFooter>
            <DialogClose>{t("close")}</DialogClose>
            <Button type="submit" loading={isSubmitting} data-testid="oauth-client-create-submit">
              {submitLabel}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
