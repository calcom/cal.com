import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import { useOrgBranding } from "@calcom/ee/organizations/context/provider";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  Avatar,
  Skeleton,
  Form,
  TextField,
  ToggleGroup,
  TextAreaField,
  TimezoneSelect,
  Label,
} from "@calcom/ui";

import type { State, Action } from "../UserListTable";
import { DisplayInfo } from "./DisplayInfo";
import { SheetFooterControls } from "./SheetFooterControls";
import { useEditMode } from "./store";

const editSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  bio: z.string(),
  role: z.enum(["ADMIN", "MEMBER"]),
  timeZone: z.string(),
  // schedules: z.array(z.string()),
  // teams: z.array(z.string()),
});

type EditSchema = z.infer<typeof editSchema>;

// function EditInfo<T extends boolean, J extends object>({
//   form,
//   formAccessorKey,
//   label,
//   defaultValue,
//   hasOptions,
//   type,
//   options,
// }: EditInfoType<T, J>) {}

function EditForm({
  selectedUser,
  avatarUrl,
  domainUrl,
}: {
  selectedUser: RouterOutputs["viewer"]["organizations"]["getUser"];
  avatarUrl: string;
  domainUrl: string;
}) {
  const { t } = useLocale();
  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: selectedUser?.name ?? "",
      email: selectedUser?.email ?? "",
      bio: selectedUser?.bio ?? "",
      role: selectedUser?.role ?? "",
      timeZone: selectedUser?.timeZone ?? "",
    },
  });

  const watchTimezone = form.watch("timeZone");

  return (
    <Form form={form} handleSubmit={(values) => console.log(values)}>
      <div className="mt-4 flex items-center gap-2">
        <Avatar
          size="lg"
          alt={`${selectedUser?.name} avatar`}
          imageSrc={avatarUrl}
          gravatarFallbackMd5="fallback"
        />
        <div className="space-between flex flex-col leading-none">
          <span className="text-emphasis text-lg font-semibold">{selectedUser?.name ?? "Nameless User"}</span>
          <p className="subtle text-sm font-normal">
            {domainUrl}/{selectedUser?.username}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col space-y-3">
        <TextField label={t("name")} {...form.register("name")} />
        <TextField label={t("email")} {...form.register("email")} />

        <TextAreaField label={t("bio")} {...form.register("bio")} />
        <div>
          <Label>{t("role")}</Label>
          <ToggleGroup
            isFullWidth
            defaultValue={selectedUser?.role ?? "MEMBER"}
            value={form.watch("role")}
            options={[
              {
                value: "MEMBER",
                label: t("member"),
              },
              {
                value: "ADMIN",
                label: t("admin"),
              },
            ]}
            onValueChange={(value: EditSchema["role"]) => {
              form.setValue("role", value);
            }}
          />
        </div>
        <div>
          <Label>{t("timezone")}</Label>
          <TimezoneSelect value={watchTimezone ?? "America/Los_Angeles"} />
        </div>
      </div>
    </Form>
  );
}

export function EditUserSheet({ state, dispatch }: { state: State; dispatch: Dispatch<Action> }) {
  const { t } = useLocale();
  const { user: selectedUser } = state.editSheet;
  const orgBranding = useOrgBranding();
  const [editMode] = useEditMode((state) => [state.editMode, state.setEditMode], shallow);
  const { data: loadedUser, isLoading } = trpc.viewer.organizations.getUser.useQuery({
    userId: selectedUser?.id,
  });

  const avatarURL = `${orgBranding?.fullDomain ?? WEBAPP_URL}/${loadedUser?.username}/avatar.png`;

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
            {!editMode ? (
              <div className="flex-grow">
                <div className="mt-4 flex items-center gap-2">
                  <Avatar
                    size="lg"
                    alt={`${loadedUser?.name} avatar`}
                    imageSrc={avatarURL}
                    gravatarFallbackMd5="fallback"
                  />
                  <div className="space-between flex flex-col leading-none">
                    <Skeleton loading={isLoading} as="p" waitForTranslation={false}>
                      <span className="text-emphasis text-lg font-semibold">
                        {loadedUser?.name ?? "Nameless User"}
                      </span>
                    </Skeleton>
                    <Skeleton loading={isLoading} as="p" waitForTranslation={false}>
                      <p className="subtle text-sm font-normal">
                        {orgBranding?.fullDomain ?? WEBAPP_URL}/{loadedUser?.username}
                      </p>
                    </Skeleton>
                  </div>
                </div>
                <div className="mt-6 flex flex-col space-y-5">
                  <DisplayInfo label={t("email")} value={loadedUser?.email ?? ""} displayCopy />
                  <DisplayInfo
                    label={t("bio")}
                    badgeColor="gray"
                    value={loadedUser?.bio ? loadedUser?.bio : t("user_has_no_bio")}
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
                  />
                  <DisplayInfo
                    label={t("teams")}
                    value={
                      teamNames && teamNames?.length === 0 ? ["user_isnt_in_any_team"] : teamNames ?? "" // TS wtf
                    }
                    asBadge={teamNames && teamNames?.length > 0}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-grow">
                <EditForm
                  selectedUser={loadedUser}
                  avatarUrl={avatarURL}
                  domainUrl={orgBranding?.fullDomain ?? WEBAPP_URL}
                />
              </div>
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
