"use client";

import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@calid/features/ui/components/dialog";
import { toast } from "@calid/features/ui/components/toast/use-toast";

import type { TeamMember } from "./MembersList";

type DeleteBulkTeamMembersProps = {
  users: TeamMember[];
  onRemove: () => void;
  isOrg?: boolean;
  teamId: number;
};

export default function DeleteBulkTeamMembers(props: DeleteBulkTeamMembersProps) {
  const { users, onRemove, isOrg = false, teamId } = props;
  const { t } = useLocale();

  const utils = trpc.useUtils();
  const deleteMembers = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.viewer.teams.get.invalidate(),
        utils.viewer.eventTypes.invalidate(),
        utils.viewer.organizations.listMembers.invalidate(),
        utils.viewer.organizations.getMembers.invalidate(),
      ]);
      toast({ title: t("success"), description: t("member_removed") });
    },
    onError(error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    },
  });

  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    if (deleteMembers.isPending) return;
    deleteMembers.mutate({
      teamIds: [teamId],
      memberIds: users.map((u) => u.id),
      isOrg,
    });
    onRemove();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button color="destructive" StartIcon="ban">
          {t("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("remove_users_from_team")}</DialogTitle>
          <DialogDescription>
            {t("remove_users_from_team_confirm", { userCount: users.length })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button color="secondary" onClick={() => setOpen(false)} disabled={deleteMembers.isPending}>
            {t("cancel")}
          </Button>
          <Button color="destructive" onClick={handleConfirm} loading={deleteMembers.isPending}>
            {t("remove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


