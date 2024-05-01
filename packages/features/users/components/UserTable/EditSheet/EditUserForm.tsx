import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import {
  Form,
  TextField,
  ToggleGroup,
  TextAreaField,
  TimezoneSelect,
  Label,
  showToast,
  Avatar,
  ImageUploader,
} from "@calcom/ui";

import type { Action } from "../UserListTable";
import { useEditMode } from "./store";

type MembershipOption = {
  value: MembershipRole;
  label: string;
};

const editSchema = z.object({
  name: z.string(),
  username: z.string(),
  email: z.string().email(),
  avatar: z.string(),
  bio: z.string(),
  role: z.enum([MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER]),
  timeZone: z.string(),
  // schedules: z.array(z.string()),
  // teams: z.array(z.string()),
});

type EditSchema = z.infer<typeof editSchema>;

export function EditForm({
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
  const session = useSession();
  const org = session?.data?.user?.org;
  const utils = trpc.useUtils();
  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: selectedUser?.name ?? "",
      username: selectedUser?.username ?? "",
      email: selectedUser?.email ?? "",
      avatar: avatarUrl,
      bio: selectedUser?.bio ?? "",
      role: selectedUser?.role ?? "",
      timeZone: selectedUser?.timeZone ?? "",
    },
  });

  const isOwner = org?.role === MembershipRole.OWNER;

  const membershipOptions = useMemo<MembershipOption[]>(() => {
    const options: MembershipOption[] = [
      {
        value: MembershipRole.MEMBER,
        label: t("member"),
      },
      {
        value: MembershipRole.ADMIN,
        label: t("admin"),
      },
    ];

    if (isOwner) {
      options.push({
        value: MembershipRole.OWNER,
        label: t("owner"),
      });
    }

    return options;
  }, [t, isOwner]);

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
          role: values.role,
          username: values.username,
          name: values.name,
          email: values.email,
          avatar: values.avatar,
          bio: values.bio,
          timeZone: values.timeZone,
        });
      }}>
      <div className="mt-4 flex flex-col gap-2">
        <Controller
          control={form.control}
          name="avatar"
          render={({ field: { value } }) => (
            <div className="flex items-center">
              <Avatar alt={`${selectedUser?.name} avatar`} imageSrc={value} size="lg" />
              <div className="ml-4">
                <ImageUploader
                  target="avatar"
                  id="avatar-upload"
                  buttonMsg={t("change_avatar")}
                  handleAvatarChange={(newAvatar) => {
                    form.setValue("avatar", newAvatar, { shouldDirty: true });
                  }}
                  imageSrc={value || undefined}
                />
              </div>
            </div>
          )}
        />
        <div className="space-between flex flex-col leading-none">
          <span className="text-emphasis text-lg font-semibold">{selectedUser?.name ?? "Nameless User"}</span>
          <p className="subtle text-sm font-normal">
            {domainUrl}/{selectedUser?.username}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col space-y-3">
        <TextField label={t("username")} {...form.register("username")} />
        <TextField label={t("name")} {...form.register("name")} />
        <TextField label={t("email")} {...form.register("email")} />

        <TextAreaField label={t("bio")} {...form.register("bio")} className="min-h-52" />
        <div>
          <Label>{t("role")}</Label>
          <ToggleGroup
            isFullWidth
            defaultValue={selectedUser?.role ?? "MEMBER"}
            value={form.watch("role")}
            options={membershipOptions}
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
