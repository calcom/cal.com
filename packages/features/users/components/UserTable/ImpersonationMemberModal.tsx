import { signIn, useSession } from "next-auth/react";
import type { Dispatch } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";

import type { UserTableAction, UserTableState } from "./types";

export function ImpersonationMemberModal(props: {
  state: UserTableState;
  dispatch: Dispatch<UserTableAction>;
}) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const teamId = session?.user.org?.id;
  const user = props.state.impersonateMember.user;

  if (!user || !teamId) return null;

  return (
    <Dialog
      open={true}
      onOpenChange={() =>
        props.dispatch({
          type: "CLOSE_MODAL",
        })
      }>
      <DialogContent type="creation" title={t("impersonate")} description={t("impersonation_user_tip")}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await signIn("impersonation-auth", {
              username: user.email,
              teamId: teamId,
            });
            props.dispatch({
              type: "CLOSE_MODAL",
            });
          }}>
          <DialogFooter showDivider className="mt-8">
            <DialogClose color="secondary">{t("cancel")}</DialogClose>
            <Button color="primary" type="submit">
              {t("impersonate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
