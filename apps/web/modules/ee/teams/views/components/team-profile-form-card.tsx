"use client";

import { getTeamUrlSync } from "@calcom/features/ee/organizations/lib/getTeamUrlSync";
import { IS_TEAM_BILLING_ENABLED_CLIENT } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import objectKeys from "@calcom/lib/objectKeys";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import type { Prisma } from "@calcom/prisma/client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Editor } from "@calcom/ui/components/editor";
import { ImageUploader } from "@calcom/ui/components/image-uploader";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { revalidateEventTypesList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/event-types/actions";
import { revalidateTeamsList } from "@calcom/web/app/(use-page-wrapper)/(main-nav)/teams/actions";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameFooter,
  CardPanel,
} from "@coss/ui/components/card";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Label } from "@coss/ui/components/label";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@coss/ui/components/input-group";
import { toastManager } from "@coss/ui/components/toast";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { CopyIcon } from "@coss/ui/icons";
import { FieldGrid, FieldGridRow } from "@coss/ui/shared/field-grid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const regex = new RegExp("^[a-zA-Z0-9-]*$");

export type TeamProfileFormCardProps = {
  team: RouterOutputs["viewer"]["teams"]["get"];
  teamId: number;
};

export function TeamProfileFormCard({
  team,
  teamId,
}: TeamProfileFormCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [firstRender, setFirstRender] = useState(true);

  const teamProfileFormSchema = z.object({
    id: z.number(),
    name: z.string().trim().min(1, t("must_enter_team_name")),
    slug: z
      .string()
      .regex(regex, {
        message:
          "Url can only have alphanumeric characters(a-z, 0-9) and hyphen(-) symbol.",
      })
      .min(1, t("team_url_required")),
    logo: z.string().nullable(),
    bio: z.string(),
  });

  type FormValues = z.infer<typeof teamProfileFormSchema>;

  const defaultValues: FormValues = {
    id: team?.id,
    name: team?.name || "",
    logo: team?.logo || "",
    bio: team?.bio || "",
    slug:
      team?.slug ||
      ((team?.metadata as Prisma.JsonObject)?.requestedSlug as string) ||
      "",
  };

  const form = useForm({
    defaultValues,
    resolver: zodResolver(teamProfileFormSchema),
  });

  const {
    formState: { isSubmitting, isDirty },
    reset,
  } = form;

  const isDisabled = isSubmitting || !isDirty;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      toastManager.add({ title: err.message, type: "error" });
    },
    async onSuccess(res) {
      reset({
        id: teamId,
        logo: res?.logoUrl,
        name: (res?.name || "") as string,
        bio: (res?.bio || "") as string,
        slug: res?.slug as string,
      });
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.getUserEventGroups.invalidate();
      revalidateEventTypesList();
      await utils.viewer.teams.list.invalidate();
      revalidateTeamsList();

      if (res?.slug) {
        await revalidateTeamDataCache({
          teamSlug: res.slug,
          orgSlug: team?.parent?.slug ?? null,
        });
      }

      toastManager.add({
        title: t("your_team_updated_successfully"),
        type: "success",
      });
    },
  });

  const publishMutation = trpc.viewer.teams.publish.useMutation({
    async onSuccess(data: { url?: string }) {
      if (data.url) {
        router.push(data.url);
      }
    },
    async onError(err) {
      toastManager.add({ title: err.message, type: "error" });
    },
  });

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toastManager.add({ title: t("team_id_copied"), type: "success" });
    } catch {
      toastManager.add({
        title: t("error_copying_to_clipboard"),
        type: "error",
      });
    }
  };

  const handleSubmit = (values: FormValues) => {
    if (team) {
      const variables = {
        name: values.name,
        slug: values.slug,
        bio: values.bio,
        logo: values.logo,
      };
      objectKeys(variables).forEach((key) => {
        if (variables[key as keyof typeof variables] === team?.[key])
          delete variables[key];
      });
      mutation.mutate({ id: team.id, ...variables });
    }
  };

  return (
    <Form className="contents" onSubmit={form.handleSubmit(handleSubmit)}>
      <CardFrame>
        <Card>
          <CardPanel>
            <FieldGrid>
              {/* Avatar / Logo */}
              {!team.parent && (
                <div className="flex gap-4 items-center max-md:col-span-2">
                  <Controller
                    control={form.control}
                    name="logo"
                    render={({ field: { value, onChange } }) => {
                      const showRemoveButton = !!value;
                      return (
                        <>
                          <Avatar
                            alt={form.getValues("name")}
                            data-testid="profile-upload-logo"
                            imageSrc={getPlaceholderAvatar(
                              value,
                              form.getValues("name")
                            )}
                            size="lg"
                          />
                          <div className="flex flex-col gap-1">
                            <Label>{t("upload_logo")}</Label>
                            <div className="flex gap-2 items-center">
                              <ImageUploader
                                target="logo"
                                id="avatar-upload"
                                buttonMsg={t("upload_logo")}
                                handleAvatarChange={onChange}
                                triggerButtonColor="secondary"
                                imageSrc={getPlaceholderAvatar(
                                  value,
                                  form.getValues("name")
                                )}
                              />
                              {showRemoveButton && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onChange(null)}
                                >
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
              )}

              {/* Team Name */}
              <FieldGridRow>
                <Controller
                  control={form.control}
                  name="name"
                  render={({
                    field: { ref, name, value, onBlur, onChange },
                    fieldState: {
                      invalid,
                      isTouched,
                      isDirty: fieldDirty,
                      error,
                    },
                  }) => (
                    <Field
                      name={name}
                      invalid={invalid}
                      touched={isTouched}
                      dirty={fieldDirty}
                    >
                      <FieldLabel>{t("team_name")}</FieldLabel>
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

              {/* Team URL */}
              <FieldGridRow>
                <Controller
                  control={form.control}
                  name="slug"
                  render={({
                    field: { ref, name, value, onBlur },
                    fieldState: {
                      invalid,
                      isTouched,
                      isDirty: fieldDirty,
                      error,
                    },
                  }) => (
                    <Field
                      name={name}
                      invalid={invalid}
                      touched={isTouched}
                      dirty={fieldDirty}
                    >
                      <FieldLabel>{t("team_url")}</FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText data-testid="leading-text-team-url">
                            {getTeamUrlSync(
                              {
                                orgSlug: team.parent ? team.parent.slug : null,
                                teamSlug: null,
                              },
                              { protocol: false }
                            )}
                          </InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          ref={ref}
                          className="*:[input]:ps-0!"
                          name={name}
                          value={value}
                          data-testid="team-url"
                          onBlur={onBlur}
                          onChange={(e) => {
                            form.clearErrors("slug");
                            form.setValue(
                              "slug",
                              slugify(e?.target.value, true),
                              {
                                shouldDirty: true,
                              }
                            );
                          }}
                        />
                      </InputGroup>
                      <FieldError match={!!error}>{error?.message}</FieldError>
                    </Field>
                  )}
                />
              </FieldGridRow>

              {/* Team ID */}
              <FieldGridRow>
                <Field>
                  <FieldLabel>{t("team_id")}</FieldLabel>
                  <InputGroup>
                    <InputGroupInput name="id" value={teamId} disabled />
                    <InputGroupAddon align="inline-end">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              type="button"
                              aria-label={t("copy_to_clipboard")}
                              onClick={() => handleCopy(teamId.toString())}
                            />
                          }
                        >
                          <CopyIcon aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipPopup>{t("copy_to_clipboard")}</TooltipPopup>
                      </Tooltip>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </FieldGridRow>

              {/* About / Bio */}
              <FieldGridRow>
                <Field className="items-stretch">
                  <FieldLabel>{t("about")}</FieldLabel>
                  <Editor
                    getText={() => md.render(form.getValues("bio") || "")}
                    setText={(value: string) =>
                      form.setValue("bio", turndown(value), {
                        shouldDirty: true,
                      })
                    }
                    excludedToolbarItems={["blockType"]}
                    disableLists
                    firstRender={firstRender}
                    setFirstRender={setFirstRender}
                    height="80px"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("team_description")}
                  </p>
                </Field>
              </FieldGridRow>
            </FieldGrid>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex gap-2 justify-end">
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={isDisabled}
            data-testid="update-team-profile"
          >
            {t("update")}
          </Button>
          {IS_TEAM_BILLING_ENABLED_CLIENT &&
            team.slug === null &&
            (team.metadata as Prisma.JsonObject)?.requestedSlug && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  publishMutation.mutate({ teamId: team.id });
                }}
              >
                {t("team_publish")}
              </Button>
            )}
        </CardFrameFooter>
      </CardFrame>
    </Form>
  );
}
