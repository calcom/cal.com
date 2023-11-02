import { signIn, useSession } from "next-auth/react";
import type { Dispatch } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@calcom/ui";

import type { Action, State } from "./UserListTable";

export function ImpersonationMemberModal(props: { state: State; dispatch: Dispatch<Action> }) {
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
