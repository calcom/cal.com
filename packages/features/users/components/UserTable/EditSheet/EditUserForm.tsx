import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import { useMemo, useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
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
  Button,
  SheetTitle,
} from "@calcom/ui";

import type { UserTableAction } from "../types";
import { useEditMode } from "./store";

type MembershipOption = {
  value: MembershipRole;
  label: string;
};

const stringOrNumber = z.string().or(z.number());

const attributeSchema = z.object({
  id: z.string(),
  options: z
    .array(
      z.object({
        label: z.string().optional(),
        value: stringOrNumber.optional(),
        createdByDSyncId: z.string().nullable().optional(),
      })
    )
    .optional(),
  value: stringOrNumber.optional(),
});

const editSchema = z.object({
  name: z.string(),
  username: z.string(),
  email: emailSchema,
  avatar: z.string(),
  bio: z.string(),
  role: z.enum([MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER]),
  timeZone: z.string(),
  // schedules: z.array(z.string()),
  // teams: z.array(z.string()),
  attributes: z.array(attributeSchema).optional(),
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
  dispatch: Dispatch<UserTableAction>;
}) {
  const setEditMode = useEditMode((state) => state.setEditMode);
  const [mutationLoading, setMutationLoading] = useState(false);
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
            // @ts-expect-error theyre there in local types but for some reason it errors?
            attributeOptions: values.attributes
              ? // @ts-expect-error  same as above
                { userId: selectedUser?.id ?? "", attributes: values.attributes }
              : undefined,
          });
          setEditMode(false);
        }}>
        <SheetHeader>
          <SheetTitle>{t("update_profile")}</SheetTitle>

          <div className="mt-6 flex flex-col gap-2">
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
          </div>
        </SheetHeader>
        <SheetBody className="mt-4 flex h-full flex-col space-y-3 px-1">
          <label className="text-emphasis mb-1 text-base font-semibold">{t("profile")}</label>
          <TextField label={t("username")} {...form.register("username")} />
          <TextField label={t("name")} {...form.register("name")} />
          <TextField label={t("email")} {...form.register("email")} />

          <TextAreaField label={t("bio")} {...form.register("bio")} className="min-h-24" />
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
          <div className="mb-4">
            <Label>{t("timezone")}</Label>
            <TimezoneSelect value={watchTimezone ?? "America/Los_Angeles"} />
          </div>
          <AttributesList selectedUserId={selectedUser?.id} />
        </SheetBody>
        <SheetFooter>
          <Button
            color="secondary"
            type="button"
            className="justify-center md:w-1/5"
            onClick={() => {
              setEditMode(false);
            }}>
            {t("cancel")}
          </Button>

          <Button type="submit" className="w-full justify-center">
            {t("update")}
          </Button>
        </SheetFooter>
      </Form>
    </>
  );
}

type Attribute = z.infer<typeof attributeSchema>;

type DefaultValueType = {
  [key: `attributes.${number}`]: Attribute;
};

function AttributesList(props: { selectedUserId: number }) {
  const { data: usersAttributes, isPending: usersAttributesPending } =
    trpc.viewer.attributes.getByUserId.useQuery({
      userId: props.selectedUserId,
    });
  const { data: attributes, isPending: attributesPending } = trpc.viewer.attributes.list.useQuery();
  const enabledAttributes = attributes?.filter((attr) => attr.enabled);

  const { t } = useLocale();
  const { control, watch, getFieldState, setValue } = useFormContext();

  const getOptionsByAttributeId = (attributeId: string) => {
    const attribute = attributes?.find((attr) => attr.id === attributeId);
    return attribute
      ? attribute.options.map((option) => ({
          value: option.id,
          label: option.value,
        }))
      : [];
  };

  const defaultValues = useMemo<DefaultValueType>(() => {
    if (!usersAttributes || usersAttributesPending || !enabledAttributes) return {};

    return enabledAttributes.reduce<DefaultValueType>((acc, enabledAttr, index) => {
      const attr = usersAttributes.find((attr) => attr.id === enabledAttr.id);
      const key = `attributes.${index}` as const;

      if (!attr) {
        acc[key] = { id: enabledAttr.id, value: "", options: [] };
      } else if (attr.type === "MULTI_SELECT") {
        acc[key] = {
          id: attr.id,
          options: attr.options.map((option) => ({
            label: option.value,
            value: option.id,
            createdByDSyncId: option.createdByDSyncId,
          })),
        };
      } else if (attr.type === "SINGLE_SELECT") {
        acc[key] = {
          id: attr.id,
          options: [
            {
              label: attr.options[0]?.value,
              value: attr.options[0]?.id,
              createdByDSyncId: attr.options[0]?.createdByDSyncId ?? null,
            },
          ],
        };
      } else {
        acc[key] = {
          id: attr.id,
          value: attr.options[0]?.value || "",
        };
      }
      return acc;
    }, {});
  }, [usersAttributes, usersAttributesPending, enabledAttributes]);

  if (!enabledAttributes || !usersAttributes) return null;
  const attributeFieldState = getFieldState("attributes");

  return (
    <div className="flex flex-col overflow-visible">
      <div className="flex flex-col gap-3 rounded-lg">
        <label className="text-emphasis mb-1 mt-6 text-base font-semibold">{t("attributes")}</label>
        {attributeFieldState.error && (
          <p className="text-error mb-2 block text-sm font-medium leading-none">
            {JSON.stringify(attributeFieldState.error)}
          </p>
        )}
        {enabledAttributes.map((attr, index) => (
          <Controller
            name={`attributes.${index}`}
            control={control}
            key={attr.id}
            defaultValue={defaultValues[`attributes.${index}`]}
            render={({ field: { value, ...field } }) => {
              const fieldValue = value as Attribute | undefined | null;
              return (
                <div className="flex w-full items-center justify-center gap-2" key={attr.id}>
                  {["TEXT", "NUMBER"].includes(attr.type) && (
                    <InputField
                      {...field}
                      containerClassName="w-full"
                      labelClassName="text-emphasis mb-2 block text-sm font-medium leading-none"
                      label={attr.name}
                      type={attr.type === "TEXT" ? "text" : "number"}
                      value={fieldValue?.value || ""}
                      onChange={(e) => {
                        field.onChange({
                          id: attr.id,
                          value: e.target.value,
                        });
                      }}
                    />
                  )}
                  {["SINGLE_SELECT", "MULTI_SELECT"].includes(attr.type) && (
                    <SelectField
                      isDisabled={attr.isLocked}
                      name={field.name}
                      containerClassName="w-full"
                      isMulti={attr.type === "MULTI_SELECT"}
                      labelProps={{
                        className: "text-emphasis mb-2 block text-sm font-medium leading-none",
                      }}
                      label={attr.name}
                      options={getOptionsByAttributeId(attr.id)}
                      value={attr.type === "MULTI_SELECT" ? fieldValue?.options : fieldValue?.options?.[0]}
                      onChange={(value) => {
                        if (!value) return;
                        const valueAsArray = value instanceof Array ? value : [value];

                        const updatedOptions =
                          attr.type === "MULTI_SELECT"
                            ? valueAsArray.map((v) => ({ label: v.label, value: v.value }))
                            : [{ label: valueAsArray[0].label, value: valueAsArray[0].value }];

                        field.onChange({
                          id: attr.id,
                          // It is also ensured in the backend that the options not owned by cal.com are not removed
                          options: getOptionsEnsuringNotOwnedByCalcomNotRemoved({
                            earlierOptions: fieldValue?.options || [],
                            updatedOptions,
                          }),
                        });
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

/**
 * Ensures that options that are not owned by cal.com are not removed
 * Such options are created by dsync and removed only through corresponding dsync
 */
function getOptionsEnsuringNotOwnedByCalcomNotRemoved<
  // Before assigning this option it can't have createdByDSyncId set
  TOptionToChoose extends { value: string | number | undefined },
  // Already set option can have createdByDSyncId set
  TOptionAlreadySet extends {
    value?: string | number | undefined;
    createdByDSyncId?: string | null | undefined;
  }
>({
  earlierOptions,
  updatedOptions,
}: {
  earlierOptions: TOptionAlreadySet[];
  updatedOptions: TOptionToChoose[];
}) {
  const optionsNotOwnedByCalcom = earlierOptions.filter((option) => !!option.createdByDSyncId);

  const newUniqueOptionsPlusNotOwnedByCalcom = [...optionsNotOwnedByCalcom, ...updatedOptions].filter(
    (option, index, self) => index === self.findIndex((o) => o.value === option.value && o.value)
  );

  return newUniqueOptionsPlusNotOwnedByCalcom;
}
