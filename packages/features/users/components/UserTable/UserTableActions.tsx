import { ExternalLink, MoreHorizontal, Edit2, UserX, Lock } from "lucide-react";
import type { Action } from "users/components/UserTable/UserListTable";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
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
} from "@calcom/ui";

import type { User } from "./UserListTable";

export function TableActions({
  user,
  permissionsForUser,
  dispatch,
}: {
  user: User;
  dispatch: React.Dispatch<Action>;
  permissionsForUser: {
    canEdit: boolean;
    canRemove: boolean;
    canImpersonate: boolean;
  };
}) {
  const { t } = useLocale();

  return (
    <>
      <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
        <Tooltip content={t("view_public_page")}>
          <Button
            target="_blank"
            href={"/" + user.username}
            color="secondary"
            className={classNames(!permissionsForUser.canEdit ? "rounded-r-md" : "")}
            variant="icon"
            StartIcon={ExternalLink}
          />
        </Tooltip>
        {(permissionsForUser.canEdit || permissionsForUser.canRemove) && (
          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button
                className="radix-state-open:rounded-r-md"
                color="secondary"
                variant="icon"
                StartIcon={MoreHorizontal}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {permissionsForUser.canEdit && (
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: "SET_CHANGE_MEMBER_ROLE_ID",
                        payload: {
                          user,
                          showModal: true,
                        },
                      })
                    }
                    StartIcon={Edit2}>
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
                      StartIcon={Lock}>
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
                    StartIcon={UserX}>
                    {t("remove")}
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
            <Button type="button" variant="icon" color="minimal" StartIcon={MoreHorizontal} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="outline-none">
              <DropdownItem type="button" StartIcon={ExternalLink}>
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
                        type: "SET_IMPERSONATE_ID",
                        payload: {
                          user,
                          showModal: true,
                        },
                      })
                    }
                    StartIcon={Edit2}>
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
                  StartIcon={UserX}>
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
