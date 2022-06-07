import { UserIcon } from "@heroicons/react/outline";
import { InformationCircleIcon } from "@heroicons/react/solid";
import { MembershipRole } from "@prisma/client";
import React, { useState, SyntheticEvent, useMemo } from "react";

import Button from "@calcom/ui/Button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/Dialog";
import { TextField } from "@calcom/ui/form/fields";

import { useLocale } from "@lib/hooks/useLocale";
import { TeamWithMembers } from "@lib/queries/teams";
import { trpc } from "@lib/trpc";

import Select from "@components/ui/form/Select";

type MemberInvitationModalProps = {
  isOpen: boolean;
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
      <DialogContent>
        <div className="mb-4 sm:flex sm:items-start">
          <div className="bg-brand text-brandcontrast dark:bg-darkmodebrand dark:text-darkmodebrandcontrast mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-opacity-5 sm:mx-0 sm:h-10 sm:w-10">
            <UserIcon className="text-brandcontrast h-6 w-6" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
              {t("invite_new_member")}
            </h3>
            <div>
              <p className="text-sm text-gray-400">{t("invite_new_team_member")}</p>
            </div>
          </div>
        </div>
        <form onSubmit={inviteMember}>
          <div className="space-y-4">
            <TextField
              label={t("email_or_username")}
              id="inviteUser"
              name="inviteUser"
              placeholder="email@example.com"
              required
            />
            <div>
              <label className="mb-1 block text-sm font-medium tracking-wide text-gray-700" htmlFor="role">
                {t("role")}
              </label>
              <Select
                defaultValue={options[0]}
                options={props.currentMember !== MembershipRole.OWNER ? options.slice(0, 2) : options}
                id="role"
                name="role"
                className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm sm:text-sm"
              />
            </div>
            <div className="relative flex items-start">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  name="sendInviteEmail"
                  defaultChecked
                  id="sendInviteEmail"
                  className="rounded-sm border-gray-300 text-black shadow-sm sm:text-sm"
                />
              </div>
              <div className="text-sm ltr:ml-2 rtl:mr-2">
                <label htmlFor="sendInviteEmail" className="font-medium text-gray-700">
                  {t("send_invite_email")}
                </label>
              </div>
            </div>
            <div className="flex flex-row rounded-sm bg-gray-50 px-3 py-2">
              <InformationCircleIcon className="h-5 w-5 flex-shrink-0 fill-gray-400" aria-hidden="true" />
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
            <Button type="button" color="secondary" onClick={props.onExit}>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
