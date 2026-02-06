import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import { useMemo, useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { TimezoneSelect } from "@calcom/web/modules/timezone/components/TimezoneSelect";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { emailSchema } from "@calcom/lib/emailSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Divider } from "@calcom/ui/components/divider";
import {
  InputField,
  TextAreaField,
  SelectField,
  Form,
  Label,
  TextField,
  ToggleGroup,
} from "@calcom/ui/components/form";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { SheetHeader, SheetBody, SheetFooter, SheetTitle } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

import type { UserTableAction } from "../types";
import { useEditMode } from "./store";

interface MembershipOption {
  value: MembershipRole | string;
  label: string;
  isCustomRole?: boolean;
}

const stringOrNumber = z.string().or(z.number());

const attributeSchema = z.object({
  id: z.string(),
  options: z
    .array(
      z.object({
        label: z.string().optional(),
        value: stringOrNumber.optional(),
        weight: z.number().optional(),
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
  role: z.union([z.nativeEnum(MembershipRole), z.string()]),
  timeZone: timeZoneSchema,
  attributes: z.array(attributeSchema).optional(),
});

type EditSchema = z.infer<typeof editSchema>;

export function EditForm({
  selectedUser,
  avatarUrl,
  domainUrl,
  dispatch,
  canEditAttributesForUser,
}: {
  selectedUser: RouterOutputs["viewer"]["organizations"]["getUser"];
  avatarUrl: string;
  domainUrl: string;
  dispatch: Dispatch<UserTableAction>;
  canEditAttributesForUser?: boolean;
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

  const { data: teamRoles, isLoading: isLoadingRoles } = trpc.viewer.pbac.getTeamRoles.useQuery(
    // @ts-expect-error this query is only ran when we have an orgId so can ignore this
    { teamId: org?.id },
    {
      enabled: !!org?.id, // Only enable the query when we have a valid team ID
      staleTime: 30000, // Cache for 30 seconds
    }
  );

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
            role: values.role as MembershipRole,
            username: values.username,
            name: values.name,
            email: values.email,
            avatar: values.avatar,
            bio: values.bio,
            timeZone: values.timeZone,
            // @ts-expect-error they're there in local types but for some reason it errors?
            attributeOptions: values.attributes
              ? { userId: selectedUser?.id ?? "", attributes: values.attributes }
              : undefined,
          });
          setEditMode(false);
        }}>
        <SheetHeader>
          <SheetTitle>{t("update_profile")}</SheetTitle>
        </SheetHeader>
        <SheetBody className="bg-cal-muted border-subtle mt-6 gap-4 rounded-xl border p-4">
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
          <TextField label={t("name")} {...form.register("name")} className="mb-6" />
          <TextField label={t("username")} {...form.register("username")} className="mb-6" />
          <TextAreaField label={t("about")} {...form.register("bio")} className="min-h-24 mb-6" />
          <div className="mb-6">
            <Label>{t("role")}</Label>
            {teamRoles?.length > 0 ? (
              <SelectField
                defaultValue={membershipOptions.find(
                  (option) => option.value === (selectedUser?.role ?? "MEMBER")
                )}
                value={membershipOptions.find((option) => option.value === form.watch("role"))}
                options={membershipOptions}
                onChange={(option) => {
                  if (option) {
                    form.setValue("role", option.value);
                  }
                }}
              />
            ) : (
              <ToggleGroup
                isFullWidth
                defaultValue={selectedUser?.role ?? "MEMBER"}
                value={form.watch("role")}
                options={membershipOptions}
                onValueChange={(value) => {
                  form.setValue("role", value);
                }}
              />
            )}
          </div>
          <div className="mb-6">
            <Label>{t("timezone")}</Label>
            <TimezoneSelect value={watchTimezone ?? "America/Los_Angeles"} />
          </div>
          {canEditAttributesForUser && (
            <>
              <Divider />
              <AttributesList selectedUserId={selectedUser?.id} />
            </>
          )}
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
  const { data: attributes } = trpc.viewer.attributes.list.useQuery();
  const enabledAttributes = attributes?.filter((attr) => attr.enabled);

  const { t } = useLocale();
  const { control, getFieldState } = useFormContext();

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
            createdByDSyncId: option.createdByDSyncId ?? null,
            weight: option.weight ?? 100,
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
              weight: attr.options[0]?.weight ?? 100,
            },
          ],
        };
      } else if (attr.type === "TEXT") {
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
                <div className="flex w-full items-center justify-center" key={attr.id}>
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
                    <div className="w-full">
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
                              ? valueAsArray.map((v) => ({
                                  label: v.label,
                                  value: v.value,
                                  weight: v.weight || 100,
                                }))
                              : [
                                  {
                                    label: valueAsArray[0].label,
                                    value: valueAsArray[0].value,
                                    weight: valueAsArray[0].weight || 100,
                                  },
                                ];

                          field.onChange({
                            id: attr.id,
                            options: getOptionsEnsuringNotOwnedByCalcomNotRemoved({
                              earlierOptions: fieldValue?.options || [],
                              updatedOptions,
                            }),
                          });
                        }}
                      />
                      {attr.isWeightsEnabled && fieldValue?.options && (
                        <div className="mt-3 stack-y-2">
                          <Label>Weights</Label>
                          <div className="">
                            {fieldValue.options.map((option, idx) => {
                              return (
                                <>
                                  <div key={option.value} className="flex items-center justify-between">
                                    <Label
                                      htmlFor={`attributes.${index}.options.${idx}.weight`}
                                      className="text-subtle">
                                      {option.label}
                                    </Label>
                                    <InputField
                                      noLabel
                                      name={`attributes.${index}.options.${idx}.weight`}
                                      type="number"
                                      step={10}
                                      value={option.weight || 100}
                                      onChange={(e) => {
                                        const newWeight = parseFloat(e.target.value) || 1;
                                        const newOptions = fieldValue?.options?.map((opt, i) =>
                                          i === idx ? { ...opt, weight: newWeight } : opt
                                        );
                                        field.onChange({
                                          id: attr.id,
                                          options: newOptions,
                                        });
                                      }}
                                      addOnSuffix={<span className="text-subtle text-sm">%</span>}
                                    />
                                  </div>
                                </>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
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
  },
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
