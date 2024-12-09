import type { EventType } from "@prisma/client";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { TeamEventTypeForm } from "@calcom/features/ee/teams/components/TeamEventTypeForm";
import { useCreateEventType } from "@calcom/lib/hooks/useCreateEventType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, showToast } from "@calcom/ui";

import usePostHog from "../../ee/event-tracking/lib/posthog/userPostHog";
import CreateEventTypeForm from "./CreateEventTypeForm";

// this describes the uniform data needed to create a new event type on Profile or Team
export interface EventTypeParent {
  teamId: number | null | undefined; // if undefined, then it's a profile
  membershipRole?: MembershipRole | null;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

const locationFormSchema = z.array(
  z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(), // URL validates as new URL() - which requires HTTPS:// In the input field
  })
);

const querySchema = z.object({
  eventPage: z.string().optional(),
  teamId: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  description: z.string().optional(),
  schedulingType: z.nativeEnum(SchedulingType).optional(),
  locations: z
    .string()
    .transform((jsonString) => locationFormSchema.parse(JSON.parse(jsonString)))
    .optional(),
});

export default function CreateEventTypeDialog({
  profileOptions,
}: {
  profileOptions: {
    teamId: number | null | undefined;
    label: string | null;
    image: string | undefined;
    membershipRole: MembershipRole | null | undefined;
  }[];
}) {
  const postHog = usePostHog();
  const { t } = useLocale();
  const router = useRouter();
  const orgBranding = useOrgBranding();

  const {
    data: { teamId, eventPage: pageSlug },
  } = useTypedQuery(querySchema);

  const teamProfile = profileOptions.find((profile) => profile.teamId === teamId);

  const isTeamAdminOrOwner =
    teamId !== undefined &&
    (teamProfile?.membershipRole === MembershipRole.OWNER ||
      teamProfile?.membershipRole === MembershipRole.ADMIN);

  const onSuccessMutation = (eventType: EventType) => {
    router.replace(`/event-types/${eventType.id}${teamId ? "?tabName=team" : ""}`);
    showToast(
      t("event_type_created_successfully", {
        eventTypeTitle: eventType.title,
      }),
      "success"
    );
  };

  const onErrorMutation = (err: string) => {
    showToast(err, "error");
  };

  const SubmitButton = (isPending: boolean) => {
    return (
      <DialogFooter showDivider>
        <DialogClose />
        <Button type="submit" loading={isPending}>
          {t("continue")}
        </Button>
      </DialogFooter>
    );
  };

  const { form, createMutation, isManagedEventType } = useCreateEventType(onSuccessMutation, onErrorMutation);

  const urlPrefix = orgBranding?.fullDomain ?? process.env.NEXT_PUBLIC_WEBSITE_URL;

  const { data: team } = trpc.viewer.teams.get.useQuery(
    { teamId: teamId ?? -1, isOrg: false },
    { enabled: !!teamId }
  );

  return (
    <Dialog
      name="new"
      clearQueryParamsOnClose={[
        "eventPage",
        "type",
        "description",
        "title",
        "length",
        "slug",
        "locations",
      ]}>
      <DialogContent
        type="creation"
        enableOverflow
        title={teamId ? t("add_new_team_event_type") : t("add_new_event_type")}
        description={t("new_event_type_to_book_description")}>
        {teamId ? (
          <TeamEventTypeForm
            teamSlug={team?.slug}
            teamId={teamId}
            isTeamAdminOrOwner={isTeamAdminOrOwner}
            urlPrefix={urlPrefix}
            isPending={createMutation.isPending}
            form={form}
            isManagedEventType={isManagedEventType}
            handleSubmit={(values) => {
              postHog.capture("Event Created Frontend");
              createMutation.mutate(values);
            }}
            SubmitButton={SubmitButton}
          />
        ) : (
          <CreateEventTypeForm
            urlPrefix={urlPrefix}
            isPending={createMutation.isPending}
            form={form}
            isManagedEventType={isManagedEventType}
            handleSubmit={(values) => {
              createMutation.mutate(values);
            }}
            SubmitButton={SubmitButton}
            pageSlug={pageSlug}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
