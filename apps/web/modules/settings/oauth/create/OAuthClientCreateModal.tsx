"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { OAuthClientFormFields } from "../view/OAuthClientFormFields";

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

export type OAuthClientCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: OAuthClientCreateFormValues) => void;
  onClose: () => void;
};

export function OAuthClientCreateDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
  onClose,
}: OAuthClientCreateDialogProps) {
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
      <DialogContent
        enableOverflow
        type="creation"
        title={t("create_oauth_client")}
        description={t("create_oauth_client_description")}>
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
              {t("create")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
