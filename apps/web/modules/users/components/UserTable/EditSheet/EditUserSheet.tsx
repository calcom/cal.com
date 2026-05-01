import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@calcom/ui/components/sheet";
import { Loader } from "@calcom/ui/components/skeleton";
import type { Dispatch } from "react";
import { shallow } from "zustand/shallow";
import type { UserTableAction, UserTableState } from "../types";
import { DisplayInfo } from "./DisplayInfo";
import { EditForm } from "./EditUserForm";
import { OrganizationBanner } from "./OrganizationBanner";
import { SheetFooterControls } from "./SheetFooterControls";
import { useEditMode } from "./store";

function removeProtocol(url: string) {
  return url.replace(/^(https?:\/\/)/, "");
}

export function EditUserSheet({
  state,
  dispatch,
  canViewAttributes,
  canEditAttributesForUser,
  canChangeMemberRole,
}: {
  state: UserTableState;
  dispatch: Dispatch<UserTableAction>;
  canViewAttributes?: boolean;
  canEditAttributesForUser?: boolean;
  canChangeMemberRole?: boolean;
}) {
  const { t } = useLocale();
  const { user: selectedUser } = state.editSheet;
  const [editMode, setEditMode] = useEditMode((state) => [state.editMode, state.setEditMode], shallow);
  const loadedUser = selectedUser as
    | (typeof selectedUser & {
        schedules?: { name: string }[];
        teams?: { name: string; accepted: boolean }[];
        bio?: string;
        avatarUrl?: string | null;
        role?: string;
        timeZone?: string;
        email?: string;
        username?: string;
      })
    | undefined;

  type TeamWithAccepted = { name: string; accepted: boolean };

  const avatarURL = `${WEBAPP_URL}/${loadedUser?.username}/avatar.png`;

  const schedulesNames = loadedUser?.schedules?.map((s) => s.name);
  const teamNames = (loadedUser?.teams as TeamWithAccepted[] | undefined)?.map(
    (t) => `${t.name} ${!t.accepted ? "(pending)" : ""}`
  );

  return (
    <Sheet
      open={true}
      onOpenChange={() => {
        setEditMode(false);
        dispatch({ type: "CLOSE_MODAL" });
      }}>
      <SheetContent className="bg-default">
        {loadedUser ? (
          !editMode ? (
            <>
              <SheetHeader showCloseButton={false} className="w-full">
                <div className="w-full rounded-xl border border-subtle bg-default p-4">
                  <OrganizationBanner />
                  <div className="ml-3 w-fit translate-y-[-50%] rounded-full bg-default p-1 ring-1 ring-[#0000000F]">
                    <Avatar asChild size="lg" alt={`${loadedUser?.name} avatar`} imageSrc={avatarURL} />
                  </div>
                  <h2 className="-mt-8 font-sans font-semibold text-2xl text-emphasis">
                    {loadedUser?.name || "Nameless User"}
                  </h2>
                  <p className="max-h-[3em] overflow-hidden text-ellipsis font-normal text-sm text-subtle">
                    {loadedUser?.bio || "This user does not have a bio..."}
                  </p>
                </div>
              </SheetHeader>
              <SheetBody className="stack-y-4 flex flex-col p-4">
                <div className="stack-y-4 mb-4 flex flex-col">
                  <h3 className="mb-1 font-semibold text-base text-emphasis">{t("profile")}</h3>
                  <DisplayInfo
                    label="Cal"
                    value={removeProtocol(`${WEBAPP_URL}/${loadedUser?.username}`)}
                    icon="external-link"
                  />
                  <DisplayInfo label={t("email")} value={loadedUser?.email ?? ""} icon="at-sign" />
                  <DisplayInfo label={t("role")} value={[loadedUser?.role ?? ""]} icon="fingerprint" />
                  <DisplayInfo label={t("timezone")} value={loadedUser?.timeZone ?? ""} icon="clock" />
                  <DisplayInfo
                    label={t("teams")}
                    value={!teamNames || teamNames.length === 0 ? "" : teamNames}
                    icon="users"
                    coloredBadges
                  />
                  <DisplayInfo
                    label={t("availability")}
                    value={!schedulesNames || schedulesNames.length === 0 ? "" : schedulesNames}
                    icon="calendar"
                  />
                </div>
              </SheetBody>
              <SheetFooter>
                <SheetFooterControls
                  canEditAttributesForUser={canEditAttributesForUser}
                  canChangeMemberRole={canChangeMemberRole}
                />
              </SheetFooter>
            </>
          ) : (
            <EditForm
              selectedUser={loadedUser}
              avatarUrl={loadedUser.avatarUrl ?? avatarURL}
              domainUrl={WEBAPP_URL}
              dispatch={dispatch}
            />
          )
        ) : (
          <Loader />
        )}
      </SheetContent>
    </Sheet>
  );
}
