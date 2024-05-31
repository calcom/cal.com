import { useSession } from "next-auth/react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  ButtonGroup,
  Tooltip,
  Button,
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  DropdownMenuSeparator,
  showToast,
} from "@calcom/ui";

import type { Action } from "./UserListTable";
import type { User } from "./UserListTable";

export function TableActions({
  user,
  permissionsForUser,
  dispatch,
  domain,
}: {
  user: User;
  dispatch: React.Dispatch<Action>;
  domain: string;
  permissionsForUser: {
    canEdit: boolean;
    canRemove: boolean;
    canImpersonate: boolean;
    canResendInvitation: boolean;
  };
}) {
  const { t, i18n } = useLocale();
  const { data: session } = useSession();
  const resendInvitationMutation = trpc.viewer.teams.resendInvitation.useMutation({
    onSuccess: () => {
      showToast(t("invitation_resent"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const usersProfileUrl = `${domain}/${user.username}`;

  if (!session?.user.org?.id) return null;

  const orgId = session?.user?.org?.id;

  return (
    <>
      <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
        <Tooltip content={t("view_public_page")}>
          <Button
            target="_blank"
            href={usersProfileUrl}
            color="secondary"
            className={classNames(!permissionsForUser.canEdit ? "rounded-r-md" : "")}
            variant="icon"
            StartIcon="external-link"
          />
        </Tooltip>
        {(permissionsForUser.canEdit || permissionsForUser.canRemove) && (
          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button
                className="radix-state-open:rounded-r-md"
                color="secondary"
                variant="icon"
                StartIcon="ellipsis"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {permissionsForUser.canEdit && (
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: "EDIT_USER_SHEET",
                        payload: {
                          user,
                          showModal: true,
                        },
                      })
                    }
                    StartIcon="pencil">
                    {t("edit")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
              {permissionsForUser.canImpersonate && (
                <>
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "SET_IMPERSONATE_ID",
                          payload: {
                            user,
                            showModal: true,
                          },
                        })
                      }
                      StartIcon="lock">
                      {t("impersonate")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {permissionsForUser.canRemove && (
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: "SET_DELETE_ID",
                        payload: {
                          user,
                          showModal: true,
                        },
                      })
                    }
                    color="destructive"
                    StartIcon="user-x">
                    {t("remove")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
              {permissionsForUser.canResendInvitation && (
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() => {
                      resendInvitationMutation.mutate({
                        teamId: orgId,
                        language: i18n.language,
                        email: user.email,
                        isOrg: true,
                      });
                    }}
                    StartIcon="send">
                    {t("resend_invitation")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </Dropdown>
        )}
      </ButtonGroup>
      <div className="flex md:hidden">
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="icon" color="minimal" StartIcon="ellipsis" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="outline-none">
              <DropdownItem type="button" StartIcon="external-link">
                {t("view_public_page")}
              </DropdownItem>
            </DropdownMenuItem>
            {permissionsForUser.canEdit && (
              <>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: "EDIT_USER_SHEET",
                        payload: {
                          user,
                          showModal: true,
                        },
                      })
                    }
                    StartIcon="pencil">
                    {t("edit")}
                  </DropdownItem>
                </DropdownMenuItem>
              </>
            )}
            {permissionsForUser.canRemove && (
              <DropdownMenuItem>
                <DropdownItem
                  type="button"
                  color="destructive"
                  onClick={() =>
                    dispatch({
                      type: "SET_DELETE_ID",
                      payload: {
                        user,
                        showModal: true,
                      },
                    })
                  }
                  StartIcon="user-x">
                  {t("remove")}
                </DropdownItem>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </>
  );
}
