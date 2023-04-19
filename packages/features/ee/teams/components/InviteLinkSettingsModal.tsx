import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, Dialog, DialogContent, DialogFooter, Form, Label, Select, showToast } from "@calcom/ui";

type InvitationLinkSettingsModalProps = {
  isOpen: boolean;
  teamId: number;
  code: string;
  expireInDays?: number;
  onExit: () => void;
};

export interface LinkSettingsForm {
  expireInDays: number | undefined;
}

export default function InviteLinkSettingsModal(props: InvitationLinkSettingsModalProps) {
  const { t } = useLocale();
  const trpcContext = trpc.useContext();

  const deactivateInviteMutation = trpc.viewer.teams.deactivateInvite.useMutation({
    onSuccess: () => {
      showToast(t("invite_link_deactivated"), "success");
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

  const expireInDaysOption = useMemo(() => {
    return [
      { value: 1, label: t("one_day") },
      { value: 7, label: t("seven_days") },
      { value: 30, label: t("thirty_days") },
      { value: undefined, label: t("never_expire") },
    ];
  }, [t]);

  const linkSettingsFormMethods = useForm<LinkSettingsForm>();

  const handleSubmit = (values: LinkSettingsForm) => {
    setInviteExpirationMutation.mutate({
      teamId: props.teamId,
      code: props.code,
      expireInDays: values.expireInDays,
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
            name="expireInDays"
            control={linkSettingsFormMethods.control}
            render={({ field: { onChange } }) => (
              <div>
                <Label className="text-emphasis font-medium" htmlFor="expireInDays">
                  {t("link_expires_after")}
                </Label>
                <Select
                  options={expireInDaysOption}
                  defaultValue={expireInDaysOption.find((option) => option.value === props.expireInDays)}
                  className="w-full"
                  onChange={(val) => onChange(val?.value)}
                />
              </div>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              color="secondary"
              onClick={() => deactivateInviteMutation.mutate({ teamId: props.teamId, code: props.code })}
              className="mr-auto"
              data-testid="copy-invite-link-button">
              {t("deactivate")}
            </Button>
            <Button type="button" color="minimal" onClick={props.onExit}>
              {t("back")}
            </Button>
            <Button
              type="submit"
              color="primary"
              className="ms-2 me-2"
              data-testid="invite-new-member-button">
              {t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
