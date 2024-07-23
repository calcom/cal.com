import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import type { Dispatch } from "react";
import { useMemo, useState } from "react";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { type AttributeOption } from "@calcom/prisma/enums";
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
  Button,
  Select,
  SelectField,
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
        <AttributesList selectedUserId={selectedUser.id} />
      </div>
    </Form>
  );
}

type GroupedAttribute = {
  id: string;
  options: {
    id: string;
    slug: string;
    value: string;
  }[];
};

type Attribute = {
  value: string;
  label: string;
  type: AttributeOption;
};

type AttributeSelection = {
  attribute: Attribute;
  options: {
    label: string;
    value: string;
  }[];
};

type FormValues = {
  attributeSelections: AttributeSelection[];
  newAttribute: AttributeSelection | undefined;
};

function AttributesList(props: { selectedUserId: number }) {
  const { data: usersAttributes, isPending: usersAttributesPending } =
    trpc.viewer.attributes.getByUserId.useQuery({
      userId: props.selectedUserId,
    });
  const [toggleAddAttribute, setToggleAddAttribute] = useState(false);
  const { data: attributes, isPending: attributesPending } = trpc.viewer.attributes.list.useQuery();

  const { t } = useLocale();

  const { control, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      attributeSelections: [],
      newAttribute: undefined,
    },
  });

  const watchedAttributeSelections = watch("attributeSelections");
  const watchedNewAttribute = watch("newAttribute");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "attributeSelections",
  });

  const attributeOptions = attributes?.map((attr) => ({
    value: attr.id,
    label: attr.name,
    type: attr.type,
  }));

  const getOptionsByAttributeId = (attributeId: string) => {
    const attribute = attributes?.find((attr) => attr.id === attributeId);
    return attribute
      ? attribute.options.map((option) => ({
          value: option.id,
          label: option.value,
        }))
      : [];
  };

  const nextAttribute = attributes?.find(
    (attr) => !watchedAttributeSelections?.some((selectedAttr) => selectedAttr.attribute.value === attr.id)
  );

  console.log({
    nextAttribute,
    watchedAttributeSelections,
    attributes,
  });

  const onSubmit = (data: FormValues) => {
    console.log(data);
  };

  return (
    <div className="flex flex-col">
      <Label className="text-subtle mb-1 text-xs font-semibold uppercase leading-none">
        {t("attributes")}
      </Label>
      <div className="flex flex-col">
        {toggleAddAttribute ? (
          <div className="bg-subtle rounged-lg flex flex-col gap-2 p-4">
            <Label className="text-subtle mb-1 text-xs font-semibold leading-none">
              {t("attribute_type")}
            </Label>
            {nextAttribute && (
              <>
                <Select
                  defaultValue={
                    attributes && attributes?.length > 0
                      ? {
                          label: attributes[0].name,
                          value: attributes[0].id,
                          type: attributes[0].type,
                        }
                      : null
                  }
                  options={attributeOptions}
                  onChange={(option) => {
                    if (!option) return;
                    setValue("newAttribute", {
                      attribute: {
                        value: option.value,
                        label: option.label,
                        type: option.type,
                      },
                      options: getOptionsByAttributeId(option.value),
                    });
                  }}
                />
                {["TEXT", "NUMBER"].includes(watchedNewAttribute?.attribute.type) && (
                  <InputField
                    name="attributeValue"
                    labelClassName="text-subtle mb-1 text-xs font-semibold leading-none"
                    label={t("attribute_value")}
                    type={watchedNewAttribute?.attribute.type === "TEXT" ? "text" : "number"}
                  />
                )}
                {["SINGLE_SELECT", "MULTI_SELECT"].includes(watchedNewAttribute?.attribute.type) && (
                  <SelectField
                    isMulti={watchedNewAttribute?.attribute.type === "MULTI_SELECT"}
                    name="attributeValue"
                    labelProps={{
                      className: "text-subtle mb-1 text-xs font-semibold leading-none",
                    }}
                    label={t("attribute_value")}
                    options={watchedNewAttribute?.options}
                  />
                )}
              </>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button color="minimal" onClick={() => setToggleAddAttribute(false)}>
                {t("cancel")}
              </Button>
              <Button
                color="secondary"
                disabled={!nextAttribute}
                onClick={() => {
                  if (!nextAttribute) return;
                  // Get an attribute that is not in the selection
                  setValue("newAttribute", {
                    attribute: {
                      value: nextAttribute?.id,
                      label: nextAttribute?.id,
                      type: nextAttribute?.type,
                    },
                    options: getOptionsByAttributeId(nextAttribute.id),
                  });
                }}>
                {t("add")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            color="minimal"
            className="w-fit"
            StartIcon="plus"
            onClick={() => {
              setToggleAddAttribute(true);
            }}>
            {t("add_attributes")}
          </Button>
        )}
      </div>
    </div>
  );
}
