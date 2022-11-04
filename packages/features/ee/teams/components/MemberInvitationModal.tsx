import { MembershipRole } from "@prisma/client";
import { useMemo } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, TextField } from "@calcom/ui/components";
import CheckboxField from "@calcom/ui/components/form/checkbox/Checkbox";
import { Form } from "@calcom/ui/form/fields";
import { Dialog, DialogContent, DialogFooter, Select } from "@calcom/ui/v2";

import { NewTeamFormValues } from "../lib/types";

type MemberInvitationModalProps = {
  isOpen: boolean;
  onExit: () => void;
  onSubmit: (values: NewMemberForm) => void;
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

  const formMethods = useFormContext<NewTeamFormValues>();
  const newMemberFormMethods = useForm<NewMemberForm>();

  const validateUniqueInvite = (value: string) => {
    const members = formMethods.getValues("members");
    return !(
      members.some((member) => member?.username === value) ||
      members.some((member) => member?.email === value)
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
          <span className=" text-sm leading-tight text-gray-500">
            Note: This will <span className="font-medium text-gray-900">cost an extra seat ($12/m)</span> on
            your subscription once this member accepts your invite.
          </span>
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
                    options={options.slice(0, 2)}
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
              // onClick={() => props.onSubmit(newMemberFormMethods.getValues())}
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
