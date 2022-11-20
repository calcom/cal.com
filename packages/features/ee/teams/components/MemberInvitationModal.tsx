import { MembershipRole } from "@prisma/client";
import { Trans } from "next-i18next";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, TextField } from "@calcom/ui/components";
import CheckboxField from "@calcom/ui/components/form/checkbox/Checkbox";
import { Form } from "@calcom/ui/form/fields";
import { Dialog, DialogContent, DialogFooter, Select } from "@calcom/ui/v2";

import { PendingMember } from "../lib/types";

type MemberInvitationModalProps = {
  isOpen: boolean;
  onExit: () => void;
  onSubmit: (values: NewMemberForm) => void;
  members: PendingMember[];
};

type MembershipRoleOption = {
  value: MembershipRole;
  label: string;
};

export interface NewMemberForm {
  emailOrUsername: string;
  role: MembershipRoleOption;
  sendInviteEmail: boolean;
}

export default function MemberInvitationModal(props: MemberInvitationModalProps) {
  const { t } = useLocale();

  const options: MembershipRoleOption[] = useMemo(() => {
    return [
      { value: "MEMBER", label: t("member") },
      { value: "ADMIN", label: t("admin") },
      { value: "OWNER", label: t("owner") },
    ];
  }, [t]);

  const newMemberFormMethods = useForm<NewMemberForm>();

  const validateUniqueInvite = (value: string) => {
    return !(
      props.members.some((member) => member?.username === value) ||
      props.members.some((member) => member?.email === value)
    );
  };

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={() => {
        props.onExit();
        newMemberFormMethods.reset();
      }}>
      <DialogContent
        type="creation"
        useOwnActionButtons
        title={t("invite_new_member")}
        description={
          IS_TEAM_BILLING_ENABLED ? (
            <span className=" text-sm leading-tight text-gray-500">
              <Trans i18nKey="invite_new_member_description">
                Note: This will <span className="font-medium text-gray-900">cost an extra seat ($15/m)</span>{" "}
                on your subscription.
              </Trans>
            </span>
          ) : (
            ""
          )
        }>
        <Form form={newMemberFormMethods} handleSubmit={(values) => props.onSubmit(values)}>
          <div className="space-y-4">
            <Controller
              name="emailOrUsername"
              control={newMemberFormMethods.control}
              rules={{
                required: t("enter_email_or_username"),
                validate: (value) => validateUniqueInvite(value) || t("member_already_invited"),
              }}
              render={({ field: { onChange }, fieldState: { error } }) => (
                <>
                  <TextField
                    label={t("email_or_username")}
                    id="inviteUser"
                    name="inviteUser"
                    placeholder="email@example.com"
                    required
                    onChange={onChange}
                  />
                  {error && <span className="text-sm text-red-800">{error.message}</span>}
                </>
              )}
            />
            <Controller
              name="role"
              control={newMemberFormMethods.control}
              defaultValue={options[0]}
              render={({ field: { onChange } }) => (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium tracking-wide text-gray-700"
                    htmlFor="role">
                    {t("role")}
                  </label>
                  <Select
                    defaultValue={options[0]}
                    options={options.filter((option) => option.value !== "OWNER")}
                    id="role"
                    name="role"
                    className="mt-1 block w-full rounded-sm border-gray-300 text-sm"
                    onChange={onChange}
                  />
                </div>
              )}
            />
            <Controller
              name="sendInviteEmail"
              control={newMemberFormMethods.control}
              defaultValue={false}
              render={() => (
                <div className="relative flex items-start">
                  <CheckboxField
                    description={t("send_invite_email")}
                    onChange={(e) => newMemberFormMethods.setValue("sendInviteEmail", e.target.checked)}
                  />
                </div>
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              color="secondary"
              onClick={() => {
                props.onExit();
                newMemberFormMethods.reset();
              }}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              color="primary"
              className="ltr:ml-2 rtl:mr-2"
              data-testid="invite-new-member-button">
              {t("invite")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
