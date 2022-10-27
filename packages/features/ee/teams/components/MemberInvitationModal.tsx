import { MembershipRole } from "@prisma/client";
import React, { useState, SyntheticEvent, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TeamWithMembers } from "@calcom/lib/server/queries/teams";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import { Button, Dialog, DialogContent, DialogFooter, Select, TextField } from "@calcom/ui/v2";
import { Form } from "@calcom/ui/v2/core/form";
import CheckboxField from "@calcom/ui/v2/core/form/Checkbox";

import { NewTeamFormValues, PendingMember } from "../lib/types";

type MemberInvitationModalProps = {
  isOpen: boolean;
  currentMember?: MembershipRole;
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
  const [errorMessage, setErrorMessage] = useState("");
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();

  const _options: MembershipRoleOption[] = [
    { value: "MEMBER", label: t("member") },
    { value: "ADMIN", label: t("admin") },
    { value: "OWNER", label: t("owner") },
  ];

  const newMemberFormMethods = useForm<NewMemberForm>();

  const options = useMemo(() => {
    _options.forEach((option, i) => {
      _options[i].label = t(option.value.toLowerCase());
    });
    return _options;
  }, [t]);

  const inviteMemberMutation = trpc.useMutation("viewer.teams.inviteMember", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
      props.onExit();
    },
    async onError(err) {
      setErrorMessage(err.message);
    },
  });

  function inviteMember(e: SyntheticEvent) {
    e.preventDefault();
    if (!props.team) return;

    const target = e.target as typeof e.target & {
      elements: {
        role: { value: MembershipRole };
        inviteUser: { value: string };
        sendInviteEmail: { checked: boolean };
      };
    };

    inviteMemberMutation.mutate({
      teamId: props.team.id,
      language: i18n.language,
      role: target.elements["role"].value,
      usernameOrEmail: target.elements["inviteUser"].value,
      sendEmailInvitation: target.elements["sendInviteEmail"].checked,
    });
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onExit}>
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
        <form>
          <div className="space-y-4">
            <Controller
              name="emailOrUsername"
              control={newMemberFormMethods.control}
              render={({ field: { onChange } }) => (
                <TextField
                  label={t("email_or_username")}
                  id="inviteUser"
                  name="inviteUser"
                  placeholder="email@example.com"
                  required
                  onChange={onChange}
                />
              )}
            />
            <Controller
              name="role"
              control={newMemberFormMethods.control}
              render={({ field: { onChange } }) => (
                <div>
                  <label
                    className="mb-1 block text-sm font-medium tracking-wide text-gray-700"
                    htmlFor="role">
                    {t("role")}
                  </label>
                  <Select
                    defaultValue={options[0]}
                    options={props.currentMember !== MembershipRole.OWNER ? options.slice(0, 2) : options}
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
          {errorMessage && (
            <p className="text-sm text-red-700">
              <span className="font-bold">Error: </span>
              {errorMessage}
            </p>
          )}
          <DialogFooter>
            <Button type="button" color="secondary" onClick={props.onExit}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => props.onSubmit(newMemberFormMethods.getValues())}
              color="primary"
              className="ltr:ml-2 rtl:mr-2"
              data-testid="invite-new-member-button">
              {t("invite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
