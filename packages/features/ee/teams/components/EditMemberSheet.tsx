import type { Dispatch } from "react";

import { DisplayInfo } from "@calcom/features/users/components/UserTable/EditSheet/DisplayInfo";
import { OrganizationBanner } from "@calcom/features/users/components/UserTable/EditSheet/OrganizationBanner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Avatar,
  Icon,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetBody,
  Skeleton,
  Tooltip,
  SheetClose,
  Button,
} from "@calcom/ui";

import type { Action, ConnectedAppsType, State, User } from "./MemberListItem";

export function EditMemberSheet({
  state,
  dispatch,
  connectedApps,
}: {
  state: State;
  dispatch: Dispatch<Action>;
  connectedApps: ConnectedAppsType[];
}) {
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
  const bookingLink = !!selectedUser.username ? `${bookerUrlWithoutProtocol}/${selectedUser.username}` : "";

  const appList = connectedApps?.map(({ logo, name, externalId }) => {
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
      <SheetContent className="bg-muted">
        <SheetHeader showCloseButton={false} className="w-full">
          <div className="border-sublte bg-default w-full rounded-xl border p-4">
            <OrganizationBanner />
            <div className="bg-default ml-3 w-fit translate-y-[-50%] rounded-full p-1 ring-1 ring-[#0000000F]">
              <Avatar asChild size="lg" alt={`${name} avatar`} imageSrc={selectedUser.avatarUrl} />
            </div>
            <Skeleton as="p" waitForTranslation={false}>
              <h2 className="text-emphasis font-sans text-2xl font-semibold">{name || "Nameless User"}</h2>
            </Skeleton>
            <Skeleton as="p" waitForTranslation={false}>
              <p className="text-subtle max-h-[3em] overflow-hidden text-ellipsis text-sm font-normal">
                {selectedUser.bio ? selectedUser?.bio : t("user_has_no_bio")}
              </p>
            </Skeleton>
          </div>
        </SheetHeader>
        <SheetBody className="flex flex-col space-y-4 p-4">
          <div className="mb-4 flex flex-col space-y-4">
            <h3 className="text-emphasis mb-1 text-base font-semibold">{t("profile")}</h3>
            <DisplayInfo label="Cal" value={bookingLink} icon="external-link" />
            <DisplayInfo label={t("email")} value={selectedUser.email} icon="at-sign" />
            <DisplayInfo label={t("role")} value={[selectedUser.role]} icon="fingerprint" />
            <div className="flex items-center gap-6">
              <div className="flex w-[110px] items-center gap-2">
                <Icon className="text-subtle h-4 w-4" name="grid-3x3" />
                <label className="text-subtle text-sm font-medium">{t("apps")}</label>
              </div>
              <div className="flex flex-1">
                {connectedApps?.length === 0 ? (
                  <div>{t("user_has_no_app_installed")}</div>
                ) : (
                  <div className="flex">{appList}</div>
                )}
              </div>
            </div>
          </div>
        </SheetBody>
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
      </SheetContent>
    </Sheet>
  );
}
