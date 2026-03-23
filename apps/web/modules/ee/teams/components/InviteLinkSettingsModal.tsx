"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";
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
import { Field, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@coss/ui/components/select";
import { toastManager } from "@coss/ui/components/toast";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

type InvitationLinkSettingsModalProps = {
  isOpen: boolean;
  teamId: number;
  token: string;
  expiresInDays?: number;
  onExit: () => void;
};

export interface LinkSettingsForm {
  expiresInDays: number | undefined;
}

const EXPIRES_NEVER = "never";

function toSelectValue(expiresInDays: number | undefined): string {
  if (expiresInDays === undefined) return EXPIRES_NEVER;
  return String(expiresInDays);
}

function fromSelectValue(value: string): number | undefined {
  if (value === EXPIRES_NEVER) return undefined;
  return Number(value);
}

export default function InviteLinkSettingsModal(props: InvitationLinkSettingsModalProps) {
  const { t } = useLocale();
  const trpcContext = trpc.useUtils();

  const deleteInviteMutation = trpc.viewer.teams.deleteInvite.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("invite_link_deleted"), type: "success" });
      trpcContext.viewer.teams.get.invalidate();
      trpcContext.viewer.teams.list.invalidate();
      revalidateTeamsList();
      props.onExit();
    },
    onError: (e) => {
      toastManager.add({ title: e.message, type: "error" });
    },
  });

  const setInviteExpirationMutation = trpc.viewer.teams.setInviteExpiration.useMutation({
    onSuccess: () => {
      toastManager.add({ title: t("invite_link_updated"), type: "success" });
      trpcContext.viewer.teams.get.invalidate();
      trpcContext.viewer.teams.list.invalidate();
      revalidateTeamsList();
      props.onExit();
    },
    onError: (e) => {
      toastManager.add({ title: e.message, type: "error" });
    },
  });

  const expiresInDaysOptions = useMemo(
    () => [
      { value: "1", label: t("one_day") },
      { value: "7", label: t("seven_days") },
      { value: "30", label: t("thirty_days") },
      { value: EXPIRES_NEVER, label: t("never_expires") },
    ],
    [t]
  );

  const linkSettingsFormMethods = useForm<{ expiresInDays: string }>({
    defaultValues: {
      expiresInDays: toSelectValue(props.expiresInDays),
    },
  });

  useEffect(() => {
    if (props.isOpen) {
      linkSettingsFormMethods.reset({ expiresInDays: toSelectValue(props.expiresInDays) });
    }
  }, [props.isOpen, props.expiresInDays, linkSettingsFormMethods.reset]);

  const handleSubmit = (values: { expiresInDays: string }) => {
    setInviteExpirationMutation.mutate({
      token: props.token,
      expiresInDays: fromSelectValue(values.expiresInDays),
    });
  };

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          props.onExit();
          linkSettingsFormMethods.reset();
        }
      }}>
      <DialogPopup showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("invite_link_settings")}</DialogTitle>
          <DialogDescription>{t("invite_link_settings_description")}</DialogDescription>
        </DialogHeader>
        <Form className="contents" onSubmit={linkSettingsFormMethods.handleSubmit(handleSubmit)}>
          <DialogPanel>
            <Controller
              name="expiresInDays"
              control={linkSettingsFormMethods.control}
              render={({ field: { name, value, onChange } }) => (
                <Field name={name}>
                  <FieldLabel>{t("link_expires_after")}</FieldLabel>
                  <Select
                    items={expiresInDaysOptions}
                    value={value}
                    onValueChange={(newValue) => {
                      if (newValue) onChange(newValue);
                    }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {expiresInDaysOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </Field>
              )}
            />
          </DialogPanel>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive-outline"
              className="me-auto"
              loading={deleteInviteMutation.isPending}
              onClick={() => deleteInviteMutation.mutate({ token: props.token })}
              data-testid="copy-invite-link-button">
              {t("delete")}
            </Button>
            <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
            <Button
              type="submit"
              loading={setInviteExpirationMutation.isPending}
              data-testid="invite-new-member-button">
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
