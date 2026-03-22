"use client";

import { useCallback, useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { AddMembersWithSwitchProps } from "./AddMembersWithSwitch";
import { AddMembersWithSwitch } from "./AddMembersWithSwitch";
import { normalizeAndValidateEmails, parseEmails } from "./emailInviteUtils";

const InviteByEmailSection = ({
  teamId,
  onInvited,
}: {
  teamId: number;
  onInvited: () => void;
}) => {
  const { t, i18n } = useLocale();
  const [emailInput, setEmailInput] = useState("");

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: (_, variables) => {
      const inviteCount = Array.isArray(variables.usernameOrEmail) ? variables.usernameOrEmail.length : 1;
      showToast(
        inviteCount > 1
          ? t("email_invite_team_bulk", { userCount: inviteCount })
          : t("email_invite_team", { email: Array.isArray(variables.usernameOrEmail) ? variables.usernameOrEmail[0] : variables.usernameOrEmail }),
        "success"
      );
      setEmailInput("");
      onInvited();
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const { validEmails, invalidEmails } = useMemo(
    () => normalizeAndValidateEmails(emailInput),
    [emailInput]
  );

  const handleInvite = useCallback(() => {
    if (!validEmails.length) {
      showToast(t("enter_emails_to_invite"), "error");
      return;
    }

    if (invalidEmails.length) {
      showToast(
        invalidEmails.length === 1
          ? t("invalid_email_address")
          : `${t("invalid_email_address")}: ${invalidEmails.join(", ")}`,
        "error"
      );
      return;
    }

    inviteMemberMutation.mutate({
      teamId,
      usernameOrEmail: validEmails,
      language: i18n.language,
      creationSource: CreationSource.WEBAPP,
    });
  }, [inviteMemberMutation, invalidEmails, i18n.language, t, teamId, validEmails]);

  return (
    <div className="border-subtle mt-3 flex flex-col gap-3 rounded-md border p-3">
      <div>
        <p className="text-default text-xs font-medium">{t("invite_team_member_by_email")}</p>
        <p className="text-subtle mt-1 text-xs">{t("invite_team_member_by_email_description")}</p>
      </div>
      <div className="flex gap-2">
        <TextField
          className="flex-1 text-sm"
          placeholder={t("invite_team_member_email_placeholder")}
          value={emailInput}
          onChange={(event) => setEmailInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleInvite();
            }
          }}
          label={t("invite_team_member_by_email")}
          labelSrOnly
          containerClassName="flex-1 mb-0"
        />
        <Button
          type="button"
          color="secondary"
          size="sm"
          disabled={!emailInput.trim() || inviteMemberMutation.isPending}
          loading={inviteMemberMutation.isPending}
          onClick={handleInvite}>
          {t("invite")}
        </Button>
      </div>
    </div>
  );
};

export const AddMembersWithSwitchWebWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  const utils = trpc.useUtils();

  utils.viewer.appRoutingForms.getAttributesForTeam.prefetch({
    teamId: props.teamId,
  });

  const handleInvited = useCallback(() => {
    void Promise.all([
      utils.viewer.teams.get.invalidate({ id: props.teamId }),
      utils.viewer.eventTypes.get.invalidate(),
      utils.viewer.eventTypes.getByViewer.invalidate(),
    ]);
  }, [props.teamId, utils]);

  return (
    <>
      <AddMembersWithSwitch {...props} />
      <InviteByEmailSection teamId={props.teamId} onInvited={handleInvited} />
    </>
  );
};
