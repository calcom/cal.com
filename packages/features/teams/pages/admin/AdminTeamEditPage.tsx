"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { TeamBillingInfo, TeamMetadata, TeamPaymentHistory } from "@calcom/features/teams/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Team } from "@calcom/prisma/client";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type FormValues = {
  name: Team["name"];
  slug: Team["slug"];
  metadata: z.infer<typeof teamMetadataSchema>;
};

export const TeamForm = ({
  team,
}: {
  team: {
    id: number;
    name: string;
    slug: string | null;
    metadata: z.infer<typeof teamMetadataSchema>;
    isOrganization: boolean;
    parentId: number | null;
  };
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const form = useForm<FormValues>({
    defaultValues: {
      name: team.name,
      slug: team.slug || "",
      metadata: team.metadata,
    },
  });

  const mutation = trpc.viewer.teams.adminUpdate.useMutation({
    onSuccess: async () => {
      showToast(t("team_updated_successfully"), "success");
      await utils.viewer.teams.adminGet.invalidate();
      await utils.viewer.teams.adminGetAll.invalidate();
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      id: team.id,
      name: values.name,
      slug: values.slug,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Basic Information Section */}
      <PanelCard title="Basic Information" subtitle="Team name and slug">
        <Form form={form} className="space-y-4 p-4" handleSubmit={onSubmit}>
          <TextField label="Name" placeholder="My Team" required {...form.register("name")} />
          <TextField label="Slug" placeholder="my-team" required {...form.register("slug")} />
          {team.parentId && (
            <p className="text-default mt-2 text-sm">
              This team belongs to an organization. Some settings may be managed at the organization
              level.
            </p>
          )}
          <Button type="submit" color="primary" loading={mutation.isPending}>
            {t("save")}
          </Button>
        </Form>
      </PanelCard>

      {/* Stripe & Billing Section */}
      <TeamBillingInfo teamId={team.id} />

      {/* Payment History Section */}
      <TeamPaymentHistory teamId={team.id} />

      {/* Metadata Section */}
      <TeamMetadata metadata={team.metadata} />
    </div>
  );
};

export const AdminTeamEditPage = ({
  team,
}: {
  team: {
    id: number;
    name: string;
    slug: string | null;
    metadata: z.infer<typeof teamMetadataSchema>;
    isOrganization: boolean;
    parentId: number | null;
  };
}) => {
  return <TeamForm team={team} />;
};

export default AdminTeamEditPage;
