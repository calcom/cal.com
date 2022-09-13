import { MembershipRole } from "@prisma/client";
import React, { useState, SyntheticEvent, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TeamWithMembers } from "@calcom/lib/server/queries/teams";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import Button from "@calcom/ui/v2/core/Button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/v2/core/Dialog";
import CheckboxField from "@calcom/ui/v2/core/form/Checkbox";
import Select from "@calcom/ui/v2/core/form/Select";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";

type MemberInvitationModalProps = {
  open: boolean;
  onOpenChange: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  team: TeamWithMembers | null;
  currentMember: MembershipRole;
  onExit: () => void;
};

type MembershipRoleOption = {
  value: MembershipRole;
  label?: string;
};

const _options: MembershipRoleOption[] = [{ value: "MEMBER" }, { value: "ADMIN" }, { value: "OWNER" }];

export default function MemberInvitationModal(props: MemberInvitationModalProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();

  const options = useMemo(() => {
    _options.forEach((option, i) => {
      _options[i].label = t(option.value.toLowerCase());
    });
    return _options;
  }, [t]);

  const formMethods = useForm();

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
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        type="creation"
        title={t("invite_new_member")}
        description={t("invite_new_team_member")}
        Icon={Icon.FiUser}
        useOwnActionButtons>
        <Form handleSubmit={inviteMember} form={formMethods}>
          <div className="space-y-4">
            <Controller
              name="invitee"
              control={formMethods.control}
              render={({ field: value }) => (
                <TextField
                  label={t("email_or_username")}
                  id="inviteUser"
                  name="inviteUser"
                  placeholder="email@example.com"
                  required
                />
              )}
            />

            <Controller
              name="role"
              control={formMethods.control}
              render={({ field: value }) => (
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
                  />
                </div>
              )}
            />

            <Controller
              name="sendEmail"
              control={formMethods.control}
              render={({ field: value }) => <CheckboxField description={t("send_invite_email")} />}
            />

            <div className="flex flex-row rounded-sm bg-gray-50 px-3 py-2">
              <Icon.FiInfo className="h-5 w-5 flex-shrink-0 fill-gray-400" aria-hidden="true" />
              <span className="ml-2 text-sm leading-tight text-gray-500">
                Note: This will cost an extra seat ($12/m) on your subscription if this invitee does not have
                a pro account.{" "}
                <a href="#" className="underline">
                  Learn More
                </a>
              </span>
            </div>
          </div>
          {errorMessage && (
            <p className="text-sm text-red-700">
              <span className="font-bold">Error: </span>
              {errorMessage}
            </p>
          )}
          <DialogFooter>
            <Button type="button" color="secondary" onClick={props.onOpenChange}>
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
