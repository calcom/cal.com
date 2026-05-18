"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";

export default function OrganizationInvitesPage() {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: invites, isLoading } = trpc.viewer.organizations.listPendingInvites.useQuery();

  const acceptMutation = trpc.viewer.organizations.acceptInvite.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listPendingInvites.invalidate();
      await utils.viewer.me.get.invalidate();
      showToast("You have joined the organization.", "success");
      router.push("/settings/organizations/general");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const declineMutation = trpc.viewer.organizations.declineInvite.useMutation({
    onSuccess: async () => {
      await utils.viewer.organizations.listPendingInvites.invalidate();
      showToast("Invite declined.", "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const pendingInvites = invites ?? [];
  const isBusy = acceptMutation.isPending || declineMutation.isPending;

  return (
    <SettingsHeader
      title="Organization invites"
      description="Pending invitations to join an organization."
      borderInShellHeader={true}>
      <div className="border-subtle border-x border-y-0 px-4 py-6 sm:px-6">
        {isLoading ? (
          <p className="text-subtle text-sm">Loading...</p>
        ) : pendingInvites.length === 0 ? (
          <p className="text-subtle text-sm">No pending invites.</p>
        ) : (
          <ul className="divide-subtle divide-y">
            {pendingInvites.map(({ team }) => (
              <li key={team.id} className="flex items-center gap-3 py-4">
                <Avatar
                  alt={team.name}
                  imageSrc={team.logoUrl ?? undefined}
                  size="md"
                  fallback={team.name[0]?.toUpperCase()}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-default text-sm font-semibold">{team.name}</p>
                  {team.slug && <p className="text-subtle text-xs">{team.slug}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="minimal"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => declineMutation.mutate({ teamId: team.id })}>
                    {t("decline")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    loading={acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate({ teamId: team.id })}>
                    {t("accept")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsHeader>
  );
}
