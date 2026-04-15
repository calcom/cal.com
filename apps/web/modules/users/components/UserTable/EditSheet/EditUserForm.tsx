import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Divider } from "@calcom/ui/components/divider";
import {
  Form,
  Label,
  SelectField,
  TextAreaField,
  TextField,
  ToggleGroup,
} from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { SheetBody, SheetFooter, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { TimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import type { UserTableAction } from "../types";
import { useEditMode } from "./store";

interface MembershipOption {
  value: MembershipRole | string;
  label: string;
  isCustomRole?: boolean;
}

const editSchema = z.object({
  name: z.string(),
  username: z.string(),
  email: emailSchema,
  avatar: z.string(),
  bio: z.string(),
  role: z.union([z.nativeEnum(MembershipRole), z.string()]),
  timeZone: timeZoneSchema,
});

type EditSchema = z.infer<typeof editSchema>;

export function EditForm({
  selectedUser,
  avatarUrl,
  domainUrl,
  dispatch,
}: {
  selectedUser: Record<string, unknown>;
  avatarUrl: string;
  domainUrl: string;
  dispatch: Dispatch<UserTableAction>;
}) {
  const setEditMode = useEditMode((state) => state.setEditMode);
  const [mutationLoading, setMutationLoading] = useState(false);
  const { t } = useLocale();
  const session = useSession();
  const org = session?.data?.user?.org;
  const utils = trpc.useUtils();
  const form = useForm<EditSchema>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: (selectedUser?.name as string) ?? "",
      username: (selectedUser?.username as string) ?? "",
      email: (selectedUser?.email as string) ?? "",
      avatar: avatarUrl,
      bio: (selectedUser?.bio as string) ?? "",
      role: (selectedUser?.role as string) ?? "",
      timeZone: (selectedUser?.timeZone as string) ?? "",
    },
  });

  const isOwner = org?.role === MembershipRole.OWNER;
  const teamRoles: { id: string; name: string }[] = [];

  const membershipOptions = useMemo<MembershipOption[]>(() => {
    // Add custom roles if they exist
    if (teamRoles?.length > 0) {
      const roles: MembershipOption[] = [];
      // Add custom roles
      teamRoles.forEach((role) => {
        roles.push({
          value: role.id,
          label: role.name,
          isCustomRole: true,
        });
      });

      return roles;
    }

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
  }, [t, isOwner, teamRoles]);

  const mutation = { mutate: (..._args: unknown[]) => {}, mutateAsync: async () => ({}), isPending: false };

  const watchTimezone = form.watch("timeZone");

  return (
    <>
      <Form
        form={form}
        className="flex h-full flex-col"
        handleSubmit={() => {
          setMutationLoading(true);
          setMutationLoading(false);
          setEditMode(false);
        }}>
        <SheetHeader>
          <SheetTitle>{t("update_profile")}</SheetTitle>
        </SheetHeader>
        <SheetBody className="bg-cal-muted border-subtle mt-6 gap-4 rounded-xl border p-4 stack-y-6">
          <div className="">
            <Controller
              control={form.control}
              name="avatar"
              render={({ field: { value } }) => (
                <div className="flex items-center">
                  <Avatar alt={`${selectedUser?.name} avatar`} imageSrc={value} size="mdLg" />
                  <div className="ml-4">
                    <ImageUploader
                      target="avatar"
                      id="avatar-upload"
                      buttonMsg={t("change_avatar")}
                      buttonSize="sm"
                      handleAvatarChange={(newAvatar) => {
                        form.setValue("avatar", newAvatar, { shouldDirty: true });
                      }}
                      imageSrc={value || undefined}
                    />
                  </div>
                </div>
              )}
            />
          </div>
          <Divider />
          <div className="stack-y-3">
            <TextField label={t("name")} {...form.register("name")} />
            <TextField label={t("username")} {...form.register("username")} />
            <TextAreaField label={t("about")} {...form.register("bio")} />
            <div>
              <Label>{t("role")}</Label>
              {teamRoles?.length > 0 ? (
                <SelectField
                  defaultValue={membershipOptions.find(
                    (option) => option.value === ((selectedUser?.role as string) ?? "MEMBER")
                  )}
                  value={membershipOptions.find((option) => option.value === form.watch("role"))}
                  options={membershipOptions}
                  onChange={(option: MembershipOption | null) => {
                    if (option) {
                      form.setValue("role", option.value);
                    }
                  }}
                />
              ) : (
                <ToggleGroup
                  isFullWidth
                  defaultValue={(selectedUser?.role as string) ?? "MEMBER"}
                  value={form.watch("role")}
                  options={membershipOptions}
                  onValueChange={(value) => {
                    form.setValue("role", value);
                  }}
                />
              )}
            </div>
            <div>
              <Label>{t("timezone")}</Label>
              <TimezoneSelect value={watchTimezone ?? "America/Los_Angeles"} />
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button
            color="secondary"
            type="button"
            className="justify-center"
            onClick={() => {
              setEditMode(false);
            }}>
            {t("cancel")}
          </Button>

          <Button type="submit" className="justify-center">
            {t("update")}
          </Button>
        </SheetFooter>
      </Form>
    </>
  );
}
