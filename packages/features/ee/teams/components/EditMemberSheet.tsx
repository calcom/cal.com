import { zodResolver } from "@hookform/resolvers/zod";
import type { Dispatch } from "react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import { DisplayInfo } from "@calcom/features/users/components/UserTable/EditSheet/DisplayInfo";
import { SheetFooterControls } from "@calcom/features/users/components/UserTable/EditSheet/SheetFooterControls";
import { useEditMode } from "@calcom/features/users/components/UserTable/EditSheet/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Form } from "@calcom/ui/components/form";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetBody } from "@calcom/ui/components/sheet";
import { Skeleton, Loader } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { updateRoleInCache } from "./MemberChangeRoleModal";
import type { Action, State, User } from "./MemberList";

const formSchema = z.object({
  role: z.enum([MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER]),
});

type FormSchema = z.infer<typeof formSchema>;

export function EditMemberSheet({
  state,
  dispatch,
  currentMember,
  teamId,
}: {
  state: State;
  dispatch: Dispatch<Action>;
  currentMember: MembershipRole;
  teamId: number;
}) {
  const { t } = useLocale();
  const { user } = state.editSheet;
  const selectedUser = user as User;
  const [editMode, setEditMode, setMutationLoading] = useEditMode(
    (state) => [state.editMode, state.setEditMode, state.setMutationLoading],
    shallow
  );
  const [role, setRole] = useState(selectedUser.role);
  const name =
    selectedUser.name ||
    (() => {
      const emailName = selectedUser.email.split("@")[0] as string;
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    })();

  const bookerUrl = selectedUser.bookerUrl;
  const utils = trpc.useUtils();
  const bookerUrlWithoutProtocol = bookerUrl.replace(/^https?:\/\//, "");
  const bookingLink = !!selectedUser.username ? `${bookerUrlWithoutProtocol}/${selectedUser.username}` : "";

  const options = useMemo(() => {
    return [
      {
        label: t("member"),
        value: MembershipRole.MEMBER,
      },
      {
        label: t("admin"),
        value: MembershipRole.ADMIN,
      },
      {
        label: t("owner"),
        value: MembershipRole.OWNER,
      },
    ].filter(({ value }) => value !== MembershipRole.OWNER || currentMember === MembershipRole.OWNER);
  }, [t, currentMember]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: selectedUser.role,
    },
  });

  const { data: getUserConnectedApps, isPending } = trpc.viewer.teams.getUserConnectedApps.useQuery({
    userIds: [selectedUser.id],
    teamId,
  });

  const connectedApps = getUserConnectedApps?.[selectedUser.id];

  const changeRoleMutation = trpc.viewer.teams.changeMemberRole.useMutation({
    onMutate: async ({ teamId, memberId, role }) => {
      await utils.viewer.teams.listMembers.cancel();
      const previousValue = utils.viewer.teams.listMembers.getInfiniteData({
        limit: 10,
        teamId,
        searchTerm: undefined,
      });

      if (previousValue) {
        updateRoleInCache({ utils, teamId, memberId, role, searchTerm: undefined });
      }

      return { previousValue };
    },
    onSuccess: async (_data, { role }) => {
      setRole(role);
      setMutationLoading(false);
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.teams.listMembers.invalidate();
      showToast(t("profile_updated_successfully"), "success");
      setEditMode(false);
    },
    async onError(err) {
      showToast(err.message, "error");
      setMutationLoading(false);
    },
  });

  function changeRole(values: FormSchema) {
    setMutationLoading(true);
    changeRoleMutation.mutate({
      teamId: teamId,
      memberId: user?.id as number,
      role: values.role,
    });
  }

  const appList = (connectedApps || []).map(({ logo, name, externalId }) => {
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
        setEditMode(false);
        dispatch({ type: "CLOSE_MODAL" });
      }}>
      <SheetContent className="bg-muted">
        {!isPending ? (
          <Form form={form} handleSubmit={changeRole} className="flex h-full flex-col">
            <SheetHeader showCloseButton={false} className="w-full">
              <div className="border-sublte bg-default w-full rounded-xl border p-4">
                <div
                  className="block w-full rounded-lg ring-1 ring-[#0000000F]"
                  style={{
                    background: "linear-gradient(to top right, var(--cal-bg-emphasis), var(--cal-bg))",
                    height: "110px",
                  }}
                />
                <div className="bg-default ml-3 w-fit translate-y-[-50%] rounded-full p-1 ring-1 ring-[#0000000F]">
                  <Avatar asChild size="lg" alt={`${name} avatar`} imageSrc={selectedUser.avatarUrl} />
                </div>
                <Skeleton as="p" waitForTranslation={false}>
                  <h2 className="text-emphasis font-sans text-2xl font-semibold">
                    {name || "Nameless User"}
                  </h2>
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
                {!editMode ? (
                  <DisplayInfo label={t("role")} value={[role]} icon="fingerprint" />
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="flex w-[110px] items-center gap-2">
                      <Icon className="h-4 w-4" name="fingerprint" />
                      <label className="text-sm font-medium">{t("role")}</label>
                    </div>
                    <div className="flex flex-1">
                      <ToggleGroup
                        isFullWidth
                        defaultValue={role}
                        value={form.watch("role")}
                        options={options}
                        onValueChange={(value: FormSchema["role"]) => {
                          form.setValue("role", value);
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-6">
                  <div className="flex w-[110px] items-center gap-2">
                    <Icon className="text-subtle h-4 w-4" name="grid-3x3" />
                    <label className="text-subtle text-sm font-medium">{t("apps")}</label>
                  </div>
                  <div className="flex flex-1">
                    {!connectedApps ? (
                      <div>{t("user_has_no_app_installed")}</div>
                    ) : (
                      <div className="flex">{appList}</div>
                    )}
                  </div>
                </div>
              </div>
            </SheetBody>
            <SheetFooter className="mt-auto">
              <SheetFooterControls />
            </SheetFooter>
          </Form>
        ) : (
          <Loader />
        )}
      </SheetContent>
    </Sheet>
  );
}
