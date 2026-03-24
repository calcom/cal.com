import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CreationSource } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";

import type { AddMembersWithSwitchProps } from "./AddMembersWithSwitch";
import { AddMembersWithSwitch } from "./AddMembersWithSwitch";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function InviteByEmailSection({
  teamId,
  onInvited,
}: {
  teamId: number;
  onInvited: () => void;
}) {
  const { t, i18n } = useLocale(); 
  const locale = i18n.language;   
  const [emailInput, setEmailInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const inviteMember = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: () => {
      showToast(t("invite_team_member"), "success");
      setEmailInput("");
      onInvited();
    },
    onError: (err) => {
      showToast(err.message || t("something_went_wrong"), "error");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleInvite = () => {
    if (isLoading) return;
    const emails = parseEmails(emailInput);
    if (!emails.length) return;

    const invalid = emails.filter((e) => !EMAIL_REGEX.test(e));
    if (invalid.length) {
      showToast(t("invalid_email_address"), "error");
      return;
    }

    setIsLoading(true);
    inviteMember.mutate({
      teamId,
      usernameOrEmail: emails.length === 1 ? emails[0] : emails,
      language: locale,
      creationSource: CreationSource.WEBAPP,
    });
  };

  return (
    <div className="border-subtle mt-3 rounded-md border p-3">
      <p className="text-default mb-2 text-xs font-medium">{t("invite_team_member_by_email")}</p>
      <p className="text-subtle mb-3 text-xs">{t("invite_team_member_by_email_description")}</p>
      <div className="flex gap-2">
        <TextField
          className="flex-1 text-sm"
          placeholder={t("invite_team_member_email_placeholder")}
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleInvite();
            }
          }}
          containerClassName="flex-1 mb-0"
          labelSrOnly
          label={t("invite_team_member_by_email")}
        />
        <Button
          type="button"
          color="secondary"
          size="sm"
          loading={isLoading}
          disabled={!emailInput.trim()}
          onClick={handleInvite}>
          {t("invite")}
        </Button>
      </div>
    </div>
  );
}

export const AddMembersWithSwitchWebWrapper = ({ ...props }: AddMembersWithSwitchProps) => {
  const utils = trpc.useUtils();

  utils.viewer.appRoutingForms.getAttributesForTeam.prefetch({
    teamId: props.teamId,
  });

  const handleInvited = () => {
    utils.viewer.teams.get.invalidate({ id: props.teamId });
    utils.viewer.eventTypes.get.invalidate();
  };

  return (
    <>
      <AddMembersWithSwitch {...props} />
      <InviteByEmailSection teamId={props.teamId} onInvited={handleInvited} />
    </>
  );
};
