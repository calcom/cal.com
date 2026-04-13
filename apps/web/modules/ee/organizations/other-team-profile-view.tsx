"use client";

import { getTeamUrlSync } from "@calcom/features/ee/organizations/lib/getTeamUrlSync";
import { IS_TEAM_BILLING_ENABLED_CLIENT, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { md } from "@calcom/lib/markdownIt";
import objectKeys from "@calcom/lib/objectKeys";
import slugify from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import type { Prisma } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Editor } from "@calcom/ui/components/editor";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { trackFormbricksAction } from "@calcom/web/modules/formbricks/lib/trackFormbricksAction";
import { Button } from "@coss/ui/components/button";
import { Card, CardFrame, CardFrameFooter, CardPanel } from "@coss/ui/components/card";
import { Field, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@coss/ui/components/input-group";
import { toastManager } from "@coss/ui/components/toast";
import { FieldGrid, FieldGridRow } from "@coss/ui/shared/field-grid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { TeamDangerZone } from "~/ee/teams/views/components/team-danger-zone";
import { TeamProfilePageSkeleton } from "~/ee/teams/views/components/team-profile-page-skeleton";

const regex = /^[a-zA-Z0-9-]*$/;

const teamProfileFormSchema = z.object({
  name: z.string(),
  slug: z
    .string()
    .regex(regex, {
      message: "Url can only have alphanumeric characters(a-z, 0-9) and hyphen(-) symbol.",
    })
    .min(1, { message: "Url cannot be left empty" }),
  bio: z.string(),
});

const OtherTeamProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [firstRender, setFirstRender] = useState(true);

  useLayoutEffect(() => {
    document.body.focus();
  }, []);

  const params = useParamsWithFallback();
  const teamId = Number(params.id);

  const {
    data: team,
    isPending,
    error: teamError,
  } = trpc.viewer.organizations.getOtherTeam.useQuery(
    { teamId: teamId },
    {
      enabled: !Number.isNaN(teamId),
    }
  );

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      toastManager.add({ title: err.message, type: "error" });
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.organizations.getOtherTeam.invalidate({ teamId });
      if (team?.slug) {
        // Org admins editing another team's profile should purge the cached team data
        revalidateTeamDataCache({
          teamSlug: team.slug,
          orgSlug: team.parent?.slug ?? null,
        });
      }
      toastManager.add({
        title: t("your_team_updated_successfully"),
        type: "success",
      });
    },
  });

  const defaultSlug = team?.slug || ((team?.metadata as Prisma.JsonObject)?.requestedSlug as string) || "";

  const form = useForm({
    resolver: zodResolver(teamProfileFormSchema),
    defaultValues: {
      name: team?.name || "",
      slug: defaultSlug,
      bio: team?.bio || "",
    },
    values: team
      ? {
          name: team.name || "",
          slug: team.slug || ((team.metadata as Prisma.JsonObject)?.requestedSlug as string) || "",
          bio: team.bio || "",
        }
      : undefined,
  });

  useEffect(
    function refactorMeWithoutEffect() {
      if (teamError) {
        router.replace("/enterprise");
      }
    },
    [teamError]
  );

  const deleteTeamMutation = trpc.viewer.organizations.deleteTeam.useMutation({
    async onSuccess() {
      await utils.viewer.organizations.listOtherTeams.invalidate();
      toastManager.add({
        title: t("your_team_disbanded_successfully"),
        type: "success",
      });
      router.push(`${WEBAPP_URL}/teams`);
      trackFormbricksAction("team_disbanded");
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

  function deleteTeam() {
    if (team?.id) deleteTeamMutation.mutate({ teamId: team.id });
  }

  const handleSubmitForm = (values: z.infer<typeof teamProfileFormSchema>) => {
    if (!team) return;
    const variables = {
      name: values.name,
      slug: values.slug,
      bio: values.bio,
    };
    objectKeys(variables).forEach((key) => {
      if (variables[key as keyof typeof variables] === team[key]) delete variables[key];
    });
    mutation.mutate({ id: team.id, ...variables });
  };

  if (isPending) {
    return <TeamProfilePageSkeleton showLogoRow={false} variant="admin" />;
  }

  if (!team) return null;

  return (
    <div className="flex flex-col gap-4">
      <Form className="contents" onSubmit={form.handleSubmit(handleSubmitForm)}>
        <CardFrame>
          <Card>
            <CardPanel>
              <FieldGrid>
                <FieldGridRow>
                  <Controller
                    control={form.control}
                    name="name"
                    render={({
                      field: { ref, name, value, onBlur, onChange },
                      fieldState: { invalid, isTouched, isDirty: fieldDirty, error },
                    }) => (
                      <Field name={name} invalid={invalid} touched={isTouched} dirty={fieldDirty}>
                        <FieldLabel>{t("team_name")}</FieldLabel>
                        <Input
                          id={name}
                          ref={ref}
                          name={name}
                          value={value ?? ""}
                          onBlur={onBlur}
                          onChange={(e) => onChange(e.target.value)}
                        />
                        <FieldError match={!!error}>{error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </FieldGridRow>

                <FieldGridRow>
                  <Controller
                    control={form.control}
                    name="slug"
                    render={({
                      field: { ref, name, value, onBlur },
                      fieldState: { invalid, isTouched, isDirty: fieldDirty, error },
                    }) => (
                      <Field name={name} invalid={invalid} touched={isTouched} dirty={fieldDirty}>
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
                            value={value ?? ""}
                            data-testid="team-url"
                            onBlur={onBlur}
                            onChange={(e) => {
                              form.clearErrors("slug");
                              form.setValue("slug", slugify(e?.target.value, true), {
                                shouldDirty: true,
                              });
                            }}
                          />
                        </InputGroup>
                        <FieldError match={!!error}>{error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </FieldGridRow>

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
                    <p className="text-sm text-muted-foreground">{t("team_description")}</p>
                  </Field>
                </FieldGridRow>
              </FieldGrid>
            </CardPanel>
          </Card>
          <CardFrameFooter className="flex gap-2 justify-end">
            <Button type="submit" loading={mutation.isPending} data-testid="update-team-profile">
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
                  }}>
                  {t("team_publish")}
                </Button>
              )}
          </CardFrameFooter>
        </CardFrame>
      </Form>

      <TeamDangerZone
        isOwner
        onDisbandTeam={deleteTeam}
        onLeaveTeam={() => {}}
        isDisbanding={deleteTeamMutation.isPending}
      />
    </div>
  );
};

export default OtherTeamProfileView;
