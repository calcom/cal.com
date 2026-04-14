"use client";

import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/i18n/useLocale";
import type { AccessScope } from "@calcom/prisma/enums";

import { OAuthClientFormFields } from "../view/OAuthClientFormFields";

import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Form } from "@coss/ui/components/form";
import { toastManager } from "@coss/ui/components/toast";

export type OAuthClientCreateFormValues = {
  name: string;
  purpose: string;
  redirectUris: string[];
  websiteUrl: string;
  logo: string;
  enablePkce: boolean;
  scopes: AccessScope[];
};

export type OAuthClientCreateDialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
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

  const form = useForm<OAuthClientCreateFormValues>({
    defaultValues: {
      name: "",
      purpose: "",
      redirectUris: [""],
      websiteUrl: "",
      logo: "",
      enablePkce: false,
      scopes: [],
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
      return;
    }
    onOpenChange?.(nextOpen);
  };

  const handleOpenChangeComplete = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}>
      <DialogPopup className="max-w-xl">
        <Form
          className="contents"
          data-testid="oauth-client-create-form"
          onSubmit={form.handleSubmit((values) => {
            const redirectUris = values.redirectUris.map((uri) => uri.trim()).filter(Boolean);
            if (redirectUris.length === 0) {
              toastManager.add({ title: t("at_least_one_redirect_uri_required"), type: "error" });
              return;
            }
            if (!values.scopes || values.scopes.length === 0) {
              toastManager.add({ title: t("oauth_client_scope_required"), type: "error" });
              return;
            }
            onSubmit({
              name: values.name.trim() || "",
              purpose: values.purpose.trim() || "",
              redirectUris,
              websiteUrl: values.websiteUrl.trim() || "",
              logo: values.logo,
              enablePkce: values.enablePkce,
              scopes: values.scopes,
            });
          })}>
          <DialogHeader>
            <DialogTitle>{t("create_oauth_client")}</DialogTitle>
            <DialogDescription>{t("create_oauth_client_description")}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-6">
            <OAuthClientFormFields form={form} />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>{t("close")}</DialogClose>
            <Button
              type="submit"
              loading={isSubmitting}
              data-testid="oauth-client-create-submit">
              {t("create")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
