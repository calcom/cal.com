import type { Dispatch } from "react";

import { DisplayInfo } from "@calcom/features/users/components/UserTable/EditSheet/DisplayInfo";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Avatar,
  Label,
  Sheet,
  SheetContent,
  SheetFooter,
  Skeleton,
  Tooltip,
  SheetClose,
  Button,
} from "@calcom/ui";

import type { Action, State, User } from "./MemberListItem";

export function EditMemberSheet({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const { t } = useLocale();
  const { user } = state.editSheet;
  const selectedUser = user as User;

  const name =
    selectedUser.name ||
    (() => {
      const emailName = selectedUser.email.split("@")[0] as string;
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    })();

  const bookerUrl = selectedUser.bookerUrl;
  const bookerUrlWithoutProtocol = bookerUrl.replace(/^https?:\/\//, "");
  const bookingLink = !!selectedUser.username && `${bookerUrlWithoutProtocol}/${selectedUser.username}`;

  const appList = selectedUser.connectedApps?.map(({ logo, name, externalId }) => {
    return logo ? (
      externalId ? (
        <div className="ltr:mr-2 rtl:ml-2 ">
          <Tooltip content={externalId}>
            <img className="h-5 w-5" src={logo} alt={`${name} logo`} />
          </Tooltip>
        </div>
      ) : (
        <div className="ltr:mr-2 rtl:ml-2">
          <img className="h-5 w-5" src={logo} alt={`${name} logo`} />
        </div>
      )
    ) : null;
  });

  return (
    <Sheet
      open={true}
      onOpenChange={() => {
        dispatch({ type: "CLOSE_MODAL" });
      }}>
      <SheetContent position="right" size="default">
        <div className="flex h-full flex-col">
          <div className="flex-grow">
            <div className="mt-4 flex items-center gap-2">
              <Avatar
                asChild
                className="h-[36px] w-[36px]"
                alt={`${name} avatar`}
                imageSrc={selectedUser.avatarUrl}
              />
              <div className="space-between flex flex-col leading-none">
                <Skeleton as="p" waitForTranslation={false}>
                  <span className="text-emphasis text-lg font-semibold">{name}</span>
                </Skeleton>
                <Skeleton as="p" waitForTranslation={false}>
                  <p className="subtle text-sm font-normal">{bookingLink}</p>
                </Skeleton>
              </div>
            </div>
            <div className="mt-6 flex flex-col space-y-5">
              <DisplayInfo label={t("email")} value={selectedUser.email} displayCopy />
              <DisplayInfo
                label={t("bio")}
                badgeColor="gray"
                value={selectedUser.bio ? selectedUser?.bio : t("user_has_no_bio")}
              />
              <DisplayInfo label={t("role")} value={selectedUser.role} asBadge badgeColor="blue" />

              <div className="flex flex-col">
                <Label className="text-subtle mb-1 text-xs font-semibold uppercase leading-none">
                  {t("apps")}
                </Label>
                {selectedUser.connectedApps?.length === 0 ? (
                  <div>{t("user_has_no_app_installed")}</div>
                ) : (
                  <div className="inline-block">{appList}</div>
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-auto">
            <SheetClose asChild>
              <Button color="secondary" type="button" className="w-full justify-center lg:w-1/5">
                {t("close")}
              </Button>
            </SheetClose>
            <Button
              type="button"
              onClick={() => {
                dispatch({
                  type: "SET_CHANGE_MEMBER_ROLE_ID",
                  payload: {
                    user,
                    showModal: true,
                  },
                });
                dispatch({
                  type: "EDIT_USER_SHEET",
                  payload: {
                    showModal: false,
                  },
                });
              }}
              className="w-full justify-center gap-2"
              variant="icon"
              key="EDIT_BUTTON"
              StartIcon="pencil">
              {t("edit")}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
