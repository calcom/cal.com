import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { TeamEventAssignmentSection } from "@calcom/features/ee/teams/components/TeamEventAssignmentSection";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { SchedulingType } from "@calcom/prisma/enums";
import { unlockedManagedEventTypeProps } from "@calcom/prisma/zod-utils";
import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";
import { trpc } from "@calcom/trpc/react";
import { Form, TextField, Tooltip, Button } from "@calcom/ui";

export const TeamEventTypeForm = () => {
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const router = useRouter();
  const orgBranding = useOrgBranding();
  const searchParams = useCompatSearchParams();

  const teamId = searchParams?.get("id") ? Number(searchParams.get("id")) : -1;

  const { data: team } = trpc.viewer.teams.get.useQuery({ teamId, isOrg: false }, { enabled: !!teamId });

  const form = useForm<z.infer<typeof createEventTypeInput>>({
    defaultValues: {
      length: 15,
    },
    resolver: zodResolver(createEventTypeInput),
  });

  const schedulingTypeWatch = form.watch("schedulingType");
  const isManagedEventType = schedulingTypeWatch === SchedulingType.MANAGED;

  useEffect(() => {
    if (isManagedEventType) {
      form.setValue("metadata.managedEventConfig.unlockedFields", unlockedManagedEventTypeProps);
    } else {
      form.setValue("metadata", null);
    }
  }, [schedulingTypeWatch]);

  const { register } = form;

  const createMutation = trpc.viewer.eventTypes.create.useMutation({
    onSuccess: async () => {
      await utils.viewer.eventTypes.getByViewer.invalidate();
      router.push(`/settings/teams/${teamId}/profile`);
      form.reset();
    },
  });

  const urlPrefix = orgBranding?.fullDomain ?? process.env.NEXT_PUBLIC_WEBSITE_URL;

  return (
    <>
      <Form
        form={form}
        handleSubmit={(values) => {
          createMutation.mutate(values);
        }}>
        <div className="mt-3 space-y-6 pb-11">
          <TextField
            type="hidden"
            labelProps={{ style: { display: "none" } }}
            {...register("teamId", { valueAsNumber: true })}
            value={teamId}
          />
          <TextField
            label={t("title")}
            placeholder={t("quick_chat")}
            data-testid="event-type-quick-chat"
            {...register("title")}
            onChange={(e) => {
              form.setValue("title", e?.target.value);
              if (form.formState.touchedFields["slug"] === undefined) {
                form.setValue("slug", slugify(e?.target.value));
              }
            }}
          />

          {urlPrefix && urlPrefix.length >= 21 ? (
            <div>
              <TextField
                label={`${t("url")}: ${urlPrefix}`}
                required
                addOnLeading={
                  <Tooltip content={!isManagedEventType ? `team/${team?.slug}` : t("username_placeholder")}>
                    <span className="max-w-24 md:max-w-56">
                      /{!isManagedEventType ? `team/${team?.slug}` : t("username_placeholder")}/
                    </span>
                  </Tooltip>
                }
                {...register("slug")}
                onChange={(e) => {
                  form.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
                }}
              />

              {isManagedEventType && (
                <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
              )}
            </div>
          ) : (
            <div>
              <TextField
                label={t("url")}
                required
                addOnLeading={
                  <Tooltip
                    content={`${urlPrefix}/${
                      !isManagedEventType ? `team/${team?.slug}` : t("username_placeholder")
                    }/`}>
                    <span className="max-w-24 md:max-w-56">
                      {urlPrefix}/{!isManagedEventType ? `team/${team?.slug}` : t("username_placeholder")}/
                    </span>
                  </Tooltip>
                }
                {...register("slug")}
              />
              {isManagedEventType && (
                <p className="mt-2 text-sm text-gray-600">{t("managed_event_url_clarification")}</p>
              )}
            </div>
          )}
          <TeamEventAssignmentSection isAdmin={true} form={form} />
          <hr className="border-subtle my-6" />
          <Button
            data-testid="finish-button"
            type="submit"
            color="primary"
            className="w-full justify-center"
            disabled={createMutation.isPending}
            onClick={() => {
              const uri = `/settings/teams/${teamId}/profile`;
              router.push(uri);
            }}>
            {t("finish")}
          </Button>
        </div>
      </Form>
    </>
  );
};
