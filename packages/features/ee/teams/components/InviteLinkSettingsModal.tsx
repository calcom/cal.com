import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, Dialog, DialogContent, DialogFooter, Form, Label, Select, showToast } from "@calcom/ui";

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

export default function InviteLinkSettingsModal(props: InvitationLinkSettingsModalProps) {
  const { t } = useLocale();
  const trpcContext = trpc.useUtils();

  const deleteInviteMutation = trpc.viewer.teams.deleteInvite.useMutation({
    onSuccess: () => {
      showToast(t("invite_link_deleted"), "success");
      trpcContext.viewer.teams.get.invalidate();
      trpcContext.viewer.teams.list.invalidate();
      props.onExit();
    },
    onError: (e) => {
      showToast(e.message, "error");
    },
  });

  const setInviteExpirationMutation = trpc.viewer.teams.setInviteExpiration.useMutation({
    onSuccess: () => {
      showToast(t("invite_link_updated"), "success");
      trpcContext.viewer.teams.get.invalidate();
      trpcContext.viewer.teams.list.invalidate();
    },
    onError: (e) => {
      showToast(e.message, "error");
    },
  });

  const expiresInDaysOption = useMemo(() => {
    return [
      { value: 1, label: t("one_day") },
      { value: 7, label: t("seven_days") },
      { value: 30, label: t("thirty_days") },
      { value: undefined, label: t("never_expires") },
    ];
  }, [t]);

  const linkSettingsFormMethods = useForm<LinkSettingsForm>({
    defaultValues: {
      expiresInDays: props.expiresInDays,
    },
  });

  const handleSubmit = (values: LinkSettingsForm) => {
    setInviteExpirationMutation.mutate({
      token: props.token,
      expiresInDays: values.expiresInDays,
    });
  };

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={() => {
        props.onExit();
        linkSettingsFormMethods.reset();
      }}>
      <DialogContent type="creation" title="Invite link settings">
        <Form form={linkSettingsFormMethods} handleSubmit={handleSubmit}>
          <Controller
            name="expiresInDays"
            control={linkSettingsFormMethods.control}
            render={({ field: { onChange } }) => (
              <div className="-mt-2">
                <Label className="text-emphasis font-medium" htmlFor="expiresInDays">
                  {t("link_expires_after")}
                </Label>
                <Select
                  options={expiresInDaysOption}
                  defaultValue={expiresInDaysOption.find((option) => option.value === props.expiresInDays)}
                  className="w-full"
                  onChange={(val) => onChange(val?.value)}
                />
              </div>
            )}
          />
          <DialogFooter showDivider className="mt-10">
            <Button
              type="button"
              color="secondary"
              onClick={() => deleteInviteMutation.mutate({ token: props.token })}
              className="mr-auto"
              data-testid="copy-invite-link-button">
              {t("delete")}
            </Button>
            <Button type="button" color="minimal" onClick={props.onExit}>
              {t("back")}
            </Button>
            <Button
              type="submit"
              color="primary"
              className="me-2 ms-2"
              data-testid="invite-new-member-button">
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
