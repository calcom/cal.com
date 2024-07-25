import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import { useMemo } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import {
  Form,
  TextField,
  ToggleGroup,
  InputField,
  TextAreaField,
  TimezoneSelect,
  Label,
  showToast,
  Avatar,
  ImageUploader,
  SelectField,
  SheetHeader,
  SheetBody,
  SheetFooter,
} from "@calcom/ui";

import type { Action } from "../UserListTable";
import { SheetFooterControls } from "./SheetFooterControls";
import { useEditMode } from "./store";

type MembershipOption = {
  value: MembershipRole;
  label: string;
};

const attributeSchema = z
  .object({
    id: z.string(),
    value: z.string().optional(),
    options: z.array(z.object({ id: z.string() })).optional(),
  })
  .refine((data) => data.value !== undefined || data.options !== undefined, {
    message: "Either 'value' or 'options' must be provided",
    path: ["value", "options"], // This will show the error on both fields
  });

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
  attributes: z.array(attributeSchema),
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
  const setEditMode = useEditMode((state) => state.setEditMode);
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
    <>
      <Form
        form={form}
        id="edit-user-form"
        className="flex h-full flex-col"
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
        <SheetHeader>
          <div className="flex flex-col gap-2">
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
              <span className="text-emphasis text-lg font-semibold">
                {selectedUser?.name ?? "Nameless User"}
              </span>
              <p className="subtle text-sm font-normal">
                {domainUrl}/{selectedUser?.username}
              </p>
            </div>
          </div>
        </SheetHeader>
        <SheetBody className="mt-6 flex h-full flex-col space-y-3">
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
        </SheetBody>
        <SheetFooter>
          <SheetFooterControls />
        </SheetFooter>
      </Form>
    </>
  );
}

type AttributeType = z.infer<typeof attributeSchema>;

function AttributesList(props: { selectedUserId: number }) {
  const { data: usersAttributes, isPending: usersAttributesPending } =
    trpc.viewer.attributes.getByUserId.useQuery({
      userId: props.selectedUserId,
    });
  const { data: attributes, isPending: attributesPending } = trpc.viewer.attributes.list.useQuery();
  const enabledAttributes = attributes?.filter((attr) => attr.enabled);

  const { t } = useLocale();
  const { control, watch, setValue } = useFormContext();

  // Watch the 'attributes' field from the form context
  const formAttributes = watch("attributes") as AttributeType[];

  // useEffect(() => {
  //   if (usersAttributes && !formAttributes) {
  //     // Initialize form attributes with user attributes when available
  //     setValue(
  //       "attributes",
  //       usersAttributes.map((attr) => ({
  //         id: attr.id,
  //         value: attr.type === "MULTI_SELECT" ? undefined : attr.value,
  //         options: attr.type === "MULTI_SELECT" ? attr.value.split(",").map((id) => ({ id })) : undefined,
  //       }))
  //     );
  //   }
  // }, [usersAttributes, formAttributes, setValue]);

  const getOptionsByAttributeId = (attributeId: string) => {
    const attribute = attributes?.find((attr) => attr.id === attributeId);
    return attribute
      ? attribute.options.map((option) => ({
          value: option.id,
          label: option.value,
        }))
      : [];
  };

  if (!enabledAttributes) return null;

  return (
    <div className="flex flex-col">
      <div className="bg-subtle flex flex-col gap-3 rounded-lg p-4">
        <Label className="text-emphasis mb-2 block text-sm font-medium leading-none">{t("attributes")}</Label>
        <p className="text-subtle mb-2 block text-sm font-medium leading-none">
          {t("attributes_leave_empty_to_hide")}
        </p>
        {enabledAttributes.map((attr) => (
          <Controller
            name={`attributes.${attr.id}`}
            control={control}
            key={attr.id}
            defaultValue={{ id: attr.id }}
            render={({ field }) => {
              return (
                <div className="flex w-full items-center justify-center gap-2" key={attr.id}>
                  {["TEXT", "NUMBER"].includes(attr.type) && (
                    <InputField
                      {...field}
                      name={`attribute_${attr.id}`}
                      containerClassName="w-full"
                      labelClassName="text-subtle mb-1 text-xs font-semibold leading-none"
                      label={attr.name}
                      type={attr.type === "TEXT" ? "text" : "number"}
                      value={field.value?.value || ""}
                      onChange={(e) => {
                        field.onChange({ id: attr.id, value: e.target.value });
                      }}
                    />
                  )}
                  {["SINGLE_SELECT", "MULTI_SELECT"].includes(attr.type) && (
                    <SelectField
                      {...field}
                      containerClassName="w-full"
                      name={`attribute_${attr.id}`}
                      isMulti={attr.type === "MULTI_SELECT"}
                      labelProps={{
                        className: "text-subtle mb-1 text-xs font-semibold leading-none",
                      }}
                      label={attr.name}
                      options={getOptionsByAttributeId(attr.id)}
                      value={attr.type === "MULTI_SELECT" ? field.value?.options : field.value?.name}
                      onChange={(value) => {
                        if (attr.type === "MULTI_SELECT") {
                          field.onChange({
                            id: attr.id,
                            options: value.map((v: any) => ({ label: v.label, value: v.value })),
                          });
                        } else {
                          field.onChange({ id: attr.id, value: value.value });
                        }
                      }}
                    />
                  )}
                </div>
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
