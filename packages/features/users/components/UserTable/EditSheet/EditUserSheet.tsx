import type { Dispatch, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Sheet, SheetContent, SheetFooter, Avatar, Skeleton, Form } from "@calcom/ui";

import type { State, Action } from "../UserListTable";
import { DisplayInfo } from "./DisplayInfo";
import { SheetFooterControls } from "./SheetFooterControls";
import { useEditMode } from "./store";

type Option = {
  value: string;
  label: string | ReactNode;
  disabled?: boolean;
  tooltip?: string;
  iconLeft?: ReactNode;
};
type EditInfoType<T extends boolean, J extends object> = {
  form: UseFormReturn<J>;
  formAccessorKey: keyof EditFormType;
  label: string;
  defaultValue: string;
  hasOptions?: T;
  type?: T extends true ? "toggle_group" | "multi_select" : "text" | "text_area" | "number";
} & (T extends true ? { options: Option[] } : { options?: never }); // Only show options if hasOptions is true

const editSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  bio: z.string(),
  role: z.string(),
  timeZone: z.string(),
  // schedules: z.array(z.string()),
  // teams: z.array(z.string()),
});

type EditFormType = z.infer<typeof editSchema>;

// function EditInfo<T extends boolean, J extends object>({
//   form,
//   formAccessorKey,
//   label,
//   defaultValue,
//   hasOptions,
//   type,
//   options,
// }: EditInfoType<T, J>) {}

function EditForm({ selectedUser }: { selectedUser: RouterOutputs["viewer"]["organizations"]["getUser"] }) {
  const form = useForm<EditFormType>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: selectedUser?.name ?? "",
      email: selectedUser?.email ?? "",
      bio: selectedUser?.bio ?? "",
      role: selectedUser?.role ?? "",
      timeZone: selectedUser?.timeZone ?? "",
    },
  });

  return (
    <Form form={form}>
      <div className="flex mt-4 items-center gap-2">
        <Avatar
          size="md"
          alt={`${selectedUser?.name} avatar`}
          imageSrc={WEBAPP_URL + "/" + selectedUser?.username + "/avatar.png"}
          gravatarFallbackMd5="fallback"
        />
        <div className="flex space-between flex-col leading-none">
          <span className="text-emphasis text-lg font-semibold">{selectedUser?.name ?? "Nameless User"}</span>
          <p className="subtle text-sm font-normal">URL/{selectedUser?.username}</p>
        </div>
      </div>
    </Form>
  );
}

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
            {editMode ? (
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
            ) : (
              <div className="flex-grow" />
            )}
            <SheetFooter className="mt-auto">
              <SheetFooterControls />
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
