"use client";

import { FULL_NAME_LENGTH_MAX_LIMIT } from "@calcom/lib/constants";
import { emailSchema } from "@calcom/lib/emailSchema";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import type { RouterOutputs } from "@calcom/trpc/react";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Editor } from "@calcom/ui/components/editor";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { DisplayInfo } from "@calcom/web/modules/users/components/UserTable/EditSheet/DisplayInfo";
import { Button } from "@coss/ui/components/button";
import { Card, CardFrame, CardFrameFooter, CardPanel } from "@coss/ui/components/card";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Fieldset, FieldsetLegend } from "@coss/ui/components/fieldset";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import { InfoIcon, PlusIcon } from "@coss/ui/icons";
import { FieldGrid, FieldGridRow } from "@coss/ui/shared/field-grid";
import { zodResolver } from "@hookform/resolvers/zod";
// eslint-disable-next-line no-restricted-imports
import { get, pick } from "lodash";
import type React from "react";
import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ProfileEmailInput } from "./profile-email-input";

// --- Types ---

type Email = {
  id: number;
  email: string;
  emailVerified: string | null;
  emailPrimary: boolean;
};

export type ProfileFormValues = {
  username: string;
  avatarUrl: string | null;
  name: string;
  email: string;
  bio: string;
  secondaryEmails: Email[];
};

type SecondaryEmailApiPayload = {
  id: number;
  email: string;
  isDeleted: boolean;
};

export type ProfileSubmitValues = Omit<ProfileFormValues, "secondaryEmails"> & {
  secondaryEmails: SecondaryEmailApiPayload[];
};

type UserAttribute = {
  name: string;
  type: string;
  options: { value: string }[];
};

// --- Props ---

export type ProfileFormCardProps = {
  defaultValues: ProfileFormValues;
  onSubmit: (values: ProfileSubmitValues) => void;
  onAddEmail: () => void;
  onResendVerifyEmail: (email: string) => void;
  onDisconnectAccount: (values: ProfileSubmitValues) => void;
  isPending: boolean;
  user: RouterOutputs["viewer"]["me"]["get"];
  usernameField?: React.ReactNode;
  showConnectedAccounts: boolean;
  identityProvider?: string;
  identityProviderEmail?: string | null;
  attributes?: UserAttribute[];
  /** The original secondary emails from the server, used to compute deletes. */
  originalSecondaryEmails?: Array<{ id: number; email: string; isDeleted?: boolean }>;
};

// --- Component ---

export function ProfileFormCard({
  defaultValues,
  onSubmit,
  onAddEmail,
  onResendVerifyEmail,
  onDisconnectAccount,
  isPending,
  user,
  usernameField,
  showConnectedAccounts,
  identityProvider,
  identityProviderEmail,
  attributes,
  originalSecondaryEmails,
}: ProfileFormCardProps) {
  const { t } = useLocale();
  const [firstRender, setFirstRender] = useState(true);

  const profileFormSchema = z.object({
    username: z.string(),
    avatarUrl: z.string().nullable(),
    name: z
      .string()
      .trim()
      .min(1, t("you_need_to_add_a_name"))
      .max(FULL_NAME_LENGTH_MAX_LIMIT, {
        message: t("max_limit_allowed_hint", { limit: FULL_NAME_LENGTH_MAX_LIMIT }),
      }),
    email: emailSchema.toLowerCase(),
    bio: z.string(),
    secondaryEmails: z.array(
      z.object({
        id: z.number(),
        email: emailSchema.toLowerCase(),
        emailVerified: z.union([z.string(), z.null()]).optional(),
        emailPrimary: z.boolean().optional(),
      })
    ),
  });

  const formMethods = useForm<ProfileFormValues>({
    defaultValues,
    resolver: zodResolver(profileFormSchema),
  });

  const {
    fields: secondaryEmailFields,
    remove: deleteSecondaryEmail,
    replace: updateAllSecondaryEmailFields,
  } = useFieldArray({
    control: formMethods.control,
    name: "secondaryEmails",
    keyName: "itemId",
  });

  const getSubmitValues = (values: ProfileFormValues): ProfileSubmitValues => {
    const changedFields = formMethods.formState.dirtyFields?.secondaryEmails || [];
    const updatedValues = { ...values };

    const primaryEmailIndex = updatedValues.secondaryEmails.findIndex((e) => e.emailPrimary);
    if (primaryEmailIndex >= 0) {
      updatedValues.email = updatedValues.secondaryEmails[primaryEmailIndex].email;
    }

    const updatedEmails: Email[] = [];
    changedFields.map((field, index) => {
      if (field?.email && updatedValues.secondaryEmails[index]?.id) {
        updatedEmails.push(updatedValues.secondaryEmails[index]);
      }
    });

    const serverEmails = originalSecondaryEmails || [];
    const deletedEmails = serverEmails.filter(
      (se) => !updatedValues.secondaryEmails.find((val) => val.id && val.id === se.id)
    );

    const secondaryEmails = [
      ...updatedEmails.map((email) => ({ ...email, isDeleted: false })),
      ...deletedEmails.map((email) => ({ ...email, isDeleted: true })),
    ].map((se) => pick(se, ["id", "email", "isDeleted"]));

    return { ...updatedValues, secondaryEmails };
  };

  const handleFormSubmit = (values: ProfileFormValues) => {
    onSubmit(getSubmitValues(values));
  };

  const handleDisconnect = () => {
    onDisconnectAccount(getSubmitValues(formMethods.getValues()));
  };

  const {
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const isDisabled = isSubmitting || !isDirty;

  return (
    <Form className="contents" onSubmit={formMethods.handleSubmit(handleFormSubmit)}>
      <CardFrame>
        <Card>
          <CardPanel>
            <FieldGrid>
              {/* Avatar */}
              <div className="flex items-center gap-4 max-md:col-span-2">
                <Controller
                  control={formMethods.control}
                  name="avatarUrl"
                  render={({ field: { value, onChange } }) => {
                    const showRemoveButton = value !== null;
                    return (
                      <>
                        <UserAvatar
                          data-testid="profile-upload-avatar"
                          previewSrc={value}
                          size="lg"
                          user={user}
                        />
                        <div className="flex flex-col gap-1">
                          <Label className="text-sm">{t("profile_picture")}</Label>
                          <div className="flex items-center gap-2">
                            <ImageUploader
                              target="avatar"
                              id="avatar-upload"
                              buttonMsg={t("upload_avatar")}
                              handleAvatarChange={(newAvatar) => onChange(newAvatar)}
                              imageSrc={getUserAvatarUrl({ avatarUrl: value })}
                              triggerButtonColor="secondary"
                            />
                            {showRemoveButton && (
                              <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
                                {t("remove")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  }}
                />
              </div>

              {/* Username (injected) */}
              <FieldGridRow>
                {usernameField}
                <p className="mt-0.5 flex gap-1 text-muted-foreground text-sm">
                  <InfoIcon aria-hidden="true" className="mt-0.5 shrink-0" />
                  <span className="flex-1">{t("tip_username_plus")}</span>
                </p>
              </FieldGridRow>

              {/* Full name */}
              <FieldGridRow>
                <Controller
                  name="name"
                  control={formMethods.control}
                  render={({
                    field: { ref, name, value, onBlur, onChange },
                    fieldState: { invalid, isTouched, isDirty: fieldDirty, error },
                  }) => (
                    <Field name={name} invalid={invalid} touched={isTouched} dirty={fieldDirty}>
                      <FieldLabel>{t("full_name")}</FieldLabel>
                      <Input
                        id={name}
                        ref={ref}
                        name={name}
                        value={value}
                        onBlur={onBlur}
                        onChange={(e) => onChange(e.target.value)}
                      />
                      <FieldError match={!!error}>{error?.message}</FieldError>
                    </Field>
                  )}
                />
              </FieldGridRow>

              {/* Emails */}
              <FieldGridRow>
                <Fieldset className="max-w-none gap-2">
                  <Label render={<FieldsetLegend />}>{t("email")}</Label>
                  <div className="flex flex-col gap-2">
                    <div
                      className={
                        secondaryEmailFields.length > 1
                          ? "grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
                          : "flex-1"
                      }>
                      {secondaryEmailFields.map((field, index) => (
                        <ProfileEmailInput
                          key={field.itemId}
                          registration={formMethods.register(`secondaryEmails.${index}.email`)}
                          errorMessage={get(
                            formMethods.formState.errors,
                            `secondaryEmails.${index}.email.message`
                          )}
                          emailVerified={Boolean(field.emailVerified)}
                          emailPrimary={field.emailPrimary}
                          dataTestId={`profile-form-email-${index}`}
                          onMakePrimary={() => {
                            const fields = secondaryEmailFields.map((sf, i) => ({
                              ...sf,
                              emailPrimary: i === index,
                            }));
                            updateAllSecondaryEmailFields(fields);
                          }}
                          onResendVerification={() => onResendVerifyEmail(field.email)}
                          onDelete={() => deleteSecondaryEmail(index)}
                        />
                      ))}
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddEmail()}
                        data-testid="add-secondary-email">
                        <PlusIcon aria-hidden="true" />
                        {t("add_email")}
                      </Button>
                    </div>
                  </div>
                </Fieldset>
              </FieldGridRow>

              {/* Bio */}
              <FieldGridRow>
                <Field className="items-stretch">
                  <FieldLabel>{t("about")}</FieldLabel>
                  <Editor
                    getText={() => md.render(formMethods.getValues("bio") || "")}
                    setText={(value: string) => {
                      formMethods.setValue("bio", turndown(value), { shouldDirty: true });
                    }}
                    disableLists
                    firstRender={firstRender}
                    setFirstRender={setFirstRender}
                    height="120px"
                  />
                </Field>
              </FieldGridRow>

              {/* Attributes */}
              {attributes && attributes.length > 0 && (
                <FieldGridRow>
                  <div className="flex flex-col gap-4">
                    <Label>{t("attributes")}</Label>
                    <div className="flex flex-col gap-4">
                      {attributes.map((attribute, index) => (
                        <DisplayInfo
                          key={index}
                          label={attribute.name}
                          labelClassname="font-normal text-sm text-muted-foreground"
                          valueClassname="text-foreground inline-flex items-center gap-1 font-normal text-sm leading-5"
                          value={
                            ["TEXT", "NUMBER", "SINGLE_SELECT"].includes(attribute.type)
                              ? attribute.options[0].value
                              : attribute.options.map((option) => option.value)
                          }
                        />
                      ))}
                    </div>
                  </div>
                </FieldGridRow>
              )}

              {/* Connected accounts */}
              {showConnectedAccounts && (
                <FieldGridRow>
                  <div className="flex flex-col gap-2">
                    <Label>{t("connected_accounts")}</Label>
                    <div className="flex items-center">
                      <span className="text-foreground text-sm capitalize">
                        {identityProvider?.toLowerCase()}
                      </span>
                      {identityProviderEmail && (
                        <span className="text-foreground ml-2 text-sm">{identityProviderEmail}</span>
                      )}
                      <div className="flex flex-1 justify-end">
                        <Button variant="destructive" onClick={handleDisconnect}>
                          {t("disconnect")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </FieldGridRow>
              )}
            </FieldGrid>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end">
          <Button loading={isPending} disabled={isDisabled} type="submit" data-testid="profile-submit-button">
            {t("update")}
          </Button>
        </CardFrameFooter>
      </CardFrame>
    </Form>
  );
}
