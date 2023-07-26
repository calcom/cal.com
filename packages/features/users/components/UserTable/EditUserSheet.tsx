import { Copy, Pencil } from "lucide-react";
import type { Dispatch } from "react";
import { create } from "zustand";
import { shallow } from "zustand/shallow";

import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetClose,
  Button,
  Avatar,
  Badge,
  type BadgeProps,
  Skeleton,
} from "@calcom/ui";

import type { State, Action } from "./UserListTable";

type DisplayInfoType<T extends boolean> = {
  label: string;
  value: T extends true ? string[] : string;
  asBadge?: boolean;
  isArray?: T;
  displayCopy?: boolean;
  badgeColor?: BadgeProps["variant"];
} & (T extends false ? { displayCopy?: boolean } : { displayCopy?: never }); // Only show displayCopy if its not an array is false

function DisplayInfo<T extends boolean>({
  label,
  value,
  asBadge,
  isArray,
  displayCopy,
  badgeColor,
}: DisplayInfoType<T>) {
  const values = (isArray ? value : [value]) as string[];

  return (
    <div className="flex flex-col space-y-0.5">
      <p className="text-subtle text-xs font-semibold uppercase leading-none">{label}</p>
      <div className={classNames(asBadge ? "flex mt-0.5 space-x-2" : "flex flex-col")}>
        <>
          {values.map((v) => {
            console.log(v);
            const content = (
              <span
                className={classNames(
                  "text-emphasis inline-flex items-center gap-2 font-medium leading-5",
                  asBadge ? "text-xs" : "text-sm"
                )}>
                {v}
                {displayCopy && <Button size="sm" variant="icon" color="minimal" StartIcon={Copy} />}
              </span>
            );

            return asBadge ? (
              <Badge variant={badgeColor} size="sm">
                {content}
              </Badge>
            ) : (
              content
            );
          })}
        </>
      </div>
    </div>
  );
}

function SheetFooterControls() {
  const [editMode, setEditMode] = useEditMode((state) => [state.editMode, state.setEditMode], shallow);
  return (
    <>
      {editMode ? (
        <>
          <Button
            color="secondary"
            className="justify-center sm:w-1/5"
            onClick={() => {
              setEditMode(false);
            }}>
            Cancel
          </Button>
          <Button type="submit" className="w-full justify-center">
            Update
          </Button>
        </>
      ) : (
        <>
          <SheetClose asChild>
            <Button color="secondary" className="justify-center sm:w-1/5">
              Close
            </Button>
          </SheetClose>
          <Button
            onClick={() => {
              setEditMode(true);
            }}
            className="w-full justify-center gap-2" // Add a gap cause us adding justify-center overrides the default gap
            variant="icon"
            StartIcon={Pencil}>
            Edit
          </Button>
        </>
      )}
    </>
  );
}

// edit mode zustand store
interface EditModeState {
  editMode: boolean;
  setEditMode: (editMode: boolean) => void;
}

const useEditMode = create<EditModeState>((set) => ({
  editMode: false,
  setEditMode: (editMode) => set({ editMode }),
}));

export function EditUserSheet({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const { t } = useLocale();
  const { user: selectedUser } = state.editSheet;
  const [editMode, setEditMode] = useEditMode((state) => [state.editMode, state.setEditMode], shallow);
  const { data: loadedUser, isLoading } = trpc.viewer.organizations.getUser.useQuery(
    { userId: selectedUser?.id },
    {
      enabled: !!selectedUser,
    }
  );

  const schedulesNames = loadedUser?.schedules && loadedUser?.schedules.map((s) => s.name);
  const teamNames =
    loadedUser?.teams && loadedUser?.teams.map((t) => `${t.name} ${!t.accepted ? "(pending)" : ""}`);

  return (
    <Sheet
      open={true}
      onOpenChange={() => {
        dispatch({ type: "CLOSE_MODAL" });
      }}>
      <SheetContent position="right" size="default">
        {!isLoading ? (
          <div className="flex h-full flex-col">
            <div className="flex-grow">
              <div className="flex mt-4 items-center gap-2">
                <Avatar
                  size="md"
                  alt={`${loadedUser?.name} avatar`}
                  imageSrc={WEBAPP_URL + "/" + loadedUser?.username + "/avatar.png"}
                  gravatarFallbackMd5="fallback"
                />
                <div className="flex space-between flex-col leading-none">
                  <Skeleton loading={isLoading} as="p" waitForTranslation={false}>
                    <span className="text-emphasis text-lg font-semibold">
                      {loadedUser?.name ?? "Nameless User"}
                    </span>
                  </Skeleton>
                  <Skeleton loading={isLoading} as="p" waitForTranslation={false}>
                    <p className="subtle text-sm font-normal">URL/{loadedUser?.username}</p>
                  </Skeleton>
                </div>
              </div>
              <div className="flex mt-6 flex-col space-y-5">
                <DisplayInfo label={t("email")} value={loadedUser?.email ?? ""} displayCopy />
                <DisplayInfo
                  label={t("bio")}
                  badgeColor="gray"
                  value={loadedUser?.bio ? loadedUser?.bio : t("user_has_no_bio")}
                  asBadge={!loadedUser?.bio}
                />
                <DisplayInfo label={t("role")} value={loadedUser?.role ?? ""} asBadge badgeColor="blue" />
                <DisplayInfo label={t("timezone")} value={loadedUser?.timeZone ?? ""} />
                <DisplayInfo
                  label={t("availability_schedules")}
                  value={
                    schedulesNames && schedulesNames?.length === 0
                      ? ["user_has_no_schedules"]
                      : schedulesNames ?? "" // TS wtf
                  }
                  asBadge={schedulesNames?.length === 0}
                  badgeColor="gray"
                />
                <DisplayInfo
                  label={t("teams")}
                  value={
                    teamNames && teamNames?.length === 0 ? ["user_isnt_in_any_team"] : teamNames ?? "" // TS wtf
                  }
                  asBadge
                  badgeColor={teamNames?.length === 0 ? "orange" : "gray"}
                />
              </div>
            </div>
            <SheetFooter className="mt-auto">
              <SheetFooterControls />
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
