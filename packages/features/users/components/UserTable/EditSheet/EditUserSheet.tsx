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
  showToast,
  Loader,
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

function EditForm({
  selectedUser,
  avatarUrl,
  domainUrl,
  dispatch,
}: {
  selectedUser: RouterOutputs["viewer"]["organizations"]["getUser"];
  avatarUrl: string;
  domainUrl: string;
  dispatch: Dispatch<Action>;
}) {
  const [setMutationLoading] = useEditMode((state) => [state.setMutationloading], shallow);
  const { t } = useLocale();
  const utils = trpc.useContext();
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

  const mutation = trpc.viewer.organizations.updateUser.useMutation({
    onSuccess: () => {
      dispatch({ type: "CLOSE_MODAL" });
      utils.viewer.organizations.listMembers.invalidate();
      showToast(t("profile_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
    onSettled: () => {
      /**
       * /We need to do this as the submit button lives out side
       *  the form for some complicated reason so we can't relay on mutationState
       */
      setMutationLoading(false);
    },
  });

  const watchTimezone = form.watch("timeZone");

  return (
    <Form
      form={form}
      id="edit-user-form"
      handleSubmit={(values) => {
        setMutationLoading(true);
        mutation.mutate({
          userId: selectedUser?.id ?? "",
          role: values.role as "ADMIN" | "MEMBER", // Cast needed as we dont provide an option for owner
          name: values.name,
          email: values.email,
          bio: values.bio,
          timeZone: values.timeZone,
        });
      }}>
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

        <TextAreaField label={t("bio")} {...form.register("bio")} className="min-h-52" />
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
  const [editMode, setEditMode] = useEditMode((state) => [state.editMode, state.setEditMode], shallow);
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
        setEditMode(false);
        dispatch({ type: "CLOSE_MODAL" });
      }}>
      <SheetContent position="right" size="default">
        {!isLoading && loadedUser ? (
          <div className="flex h-full flex-col">
            {!editMode ? (
              <div className="flex-grow">
                <div className="mt-4 flex items-center gap-2">
                  <Avatar
                    asChild
                    className="h-[36px] w-[36px]"
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
                        ? [t("user_has_no_schedules")]
                        : schedulesNames ?? "" // TS wtf
                    }
                  />
                  <DisplayInfo
                    label={t("teams")}
                    displayCount={teamNames?.length ?? 0}
                    value={
                      teamNames && teamNames?.length === 0 ? [t("user_isnt_in_any_teams")] : teamNames ?? "" // TS wtf
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
                  dispatch={dispatch}
                />
              </div>
            )}
            <SheetFooter className="mt-auto">
              <SheetFooterControls />
            </SheetFooter>
          </div>
        ) : (
          <Loader />
        )}
      </SheetContent>
    </Sheet>
  );
}
