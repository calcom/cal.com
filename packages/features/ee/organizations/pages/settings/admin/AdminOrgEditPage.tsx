"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  OrgBillingInfo,
  OrgMetadata,
  OrgPaymentHistory,
} from "@calcom/features/ee/organizations/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Team } from "@calcom/prisma/client";
import type { orgSettingsSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { Form } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

type FormValues = {
  name: Team["name"];
  slug: Team["slug"];
  organizationSettings: z.infer<typeof orgSettingsSchema>;
};

export const OrgForm = ({
  org,
}: {
  org: FormValues & {
    id: Team["id"];
  };
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.organizations.adminUpdate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.viewer.organizations.adminGetAll.invalidate(),
        utils.viewer.organizations.adminGet.invalidate({
          id: org.id,
        }),
      ]);
      showToast(t("org_has_been_processed"), "success");
      router.replace(`/settings/admin/organizations`);
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  const form = useForm<FormValues>({
    defaultValues: org,
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      id: org.id,
      ...values,
      organizationSettings: {
        ...org.organizationSettings,
        orgAutoAcceptEmail: values.organizationSettings?.orgAutoAcceptEmail,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Basic Information Section */}
      <PanelCard title="Basic Information" subtitle="Organization name, slug, and settings">
        <Form form={form} className="p-4 space-y-4" handleSubmit={onSubmit}>
          <TextField label="Name" placeholder="example" required {...form.register("name")} />
          <TextField label="Slug" placeholder="example" required {...form.register("slug")} />
          <p className="text-default mt-2 text-sm">
            Changing the slug would delete the previous organization domain and DNS and setup new domain and
            DNS for the organization.
          </p>
          <TextField
            label="Domain for which invitations are auto-accepted"
            placeholder="abc.com"
            required
            {...form.register("organizationSettings.orgAutoAcceptEmail")}
          />
          <Button type="submit" color="primary" loading={mutation.isPending}>
            {t("save")}
          </Button>
        </Form>
      </PanelCard>

      {/* Stripe & Billing Section */}
      <OrgBillingInfo orgId={org.id} />

      {/* Payment History Section */}
      <OrgPaymentHistory orgId={org.id} />

      <OrgMetadata metadata={org.metadata} orgId={org.id} />
    </div>
  );
};

export default OrgForm;
