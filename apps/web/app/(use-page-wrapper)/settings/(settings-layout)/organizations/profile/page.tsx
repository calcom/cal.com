"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { useSession } from "next-auth/react";

export default function OrganizationProfilePage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { data, isLoading } = trpc.viewer.me.get.useQuery();

  const organization =
    session?.user?.org ||
    data?.profile?.organization ||
    data?.profiles?.find((profile) => profile.organization)?.organization ||
    null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-default">{t("organization_profile")}</h1>
        <p className="text-sm text-subtle">{t("profile_org_description")}</p>
      </div>

      <div className="border-subtle rounded-md border bg-default p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="bg-subtle h-6 w-56 rounded" />
            <div className="bg-subtle h-4 w-40 rounded" />
          </div>
        ) : organization ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-subtle">{t("organization")}</p>
              <h2 className="text-lg font-semibold text-default">
                {organization?.name || t("organization")}
              </h2>
              {organization?.slug ? <p className="text-sm text-subtle">/{organization.slug}</p> : null}
            </div>

            <p className="text-sm text-default">
              {t("profile_org_description")}
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button href="/settings/organizations/members">{t("members")}</Button>
              <Button href="/event-types" color="secondary">
                {t("event_types_page_title")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-default">{t("no_organization_found")}</h2>
            <p className="text-sm text-subtle">{t("not_attached_to_org")}</p>
            <div className="pt-2">
              <Button href="/settings/my-account/profile" color="secondary">
                {t("profile")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
