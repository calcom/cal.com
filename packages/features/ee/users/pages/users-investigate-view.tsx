"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, Badge, Button, Label } from "@calcom/ui";

import type { UserAdminRouterOutputs } from "../server/trpc-router";

type User = UserAdminRouterOutputs["get"]["user"];

export const UsersInvestigateView = ({ user }: { user: User }) => {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center">
        <Avatar
          alt={user.name || ""}
          imageSrc={getUserAvatarUrl({
            avatarUrl: user.avatarUrl,
          })}
          size="lg"
        />
        <div className="ml-4 flex w-full">
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="mb-2 text-sm text-gray-500">{user.email}</p>
            <div className="flex gap-2">
              <Badge variant={user.role === "ADMIN" ? "red" : "gray"}>{user.role}</Badge>
              {user.isPlatformManaged && <Badge variant="gray">Platform Managed</Badge>}
              {user.twoFactorEnabled && <Badge variant="gray">2FA Enabled</Badge>}
              {!user.emailVerified && <Badge variant="red">Email Unverified</Badge>}
              {!user.completedOnboarding && <Badge variant="red">Onboarding not completed</Badge>}
              {user.disableImpersonation && <Badge variant="red">Impersonation disabled</Badge>}
              {user.locked && <Badge variant="red">Locked</Badge>}
              {user.smsLockState !== "UNLOCKED" && <Badge variant="red">SMS Locked</Badge>}
            </div>
          </div>
          <div className="ml-auto flex items-center">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await signIn("impersonation-auth", { redirect: false, username: user.username });
                router.replace("/settings/my-account/profile");
              }}>
              <Button color="secondary" size="sm" type="submit">
                {t("impersonate")}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <section className="mt-8 space-y-4">
        <div>
          <Label>Moved to Profile ID</Label>
          <input
            className="border-subtle bg-muted w-full rounded-md border p-2 text-sm text-gray-600"
            value={user.movedToProfileId || "None"}
            disabled={true}
          />
        </div>
        <div>
          <Label>Invited To</Label>
          <input
            className="border-subtle bg-muted w-full rounded-md border p-2 text-sm text-gray-600"
            value={user.invitedTo || "None"}
            disabled={true}
          />
        </div>
        <div>
          <Label>Trial Ends At</Label>
          <input
            className="border-subtle bg-muted w-full rounded-md border p-2 text-sm text-gray-600"
            value={user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleString() : "None"}
            disabled={true}
          />
        </div>
        <div>
          <Label>Identity Provider</Label>
          <input
            className="border-subtle bg-muted w-full rounded-md border p-2 text-sm text-gray-600"
            value={
              user.identityProvider + (user.identityProviderId ? ` (${user.identityProviderId})` : "") ||
              "None"
            }
            disabled={true}
          />
        </div>
        {user.twoFactorEnabled && (
          <div>
            <Label>2FA Secret</Label>
            <input
              className="border-subtle bg-muted w-full rounded-md border p-2 text-sm text-gray-600"
              value={user.twoFactorSecret || "None"}
              disabled={true}
            />
          </div>
        )}
        {user.twoFactorEnabled && user.backupCodes && (
          <div>
            <Label>2FA Backup Codes</Label>
            <input
              className="border-subtle bg-muted w-full rounded-md border p-2 text-sm text-gray-600"
              value={user.backupCodes || "None"}
              disabled={true}
            />
          </div>
        )}
        <div>
          <Label>Referral Link ID</Label>
          <input
            className="border-subtle bg-muted w-full rounded-md border p-2 text-sm text-gray-600"
            value={user.referralLinkId || "None"}
            disabled={true}
          />
        </div>
        <div>
          <Label>Metadata</Label>
          <textarea
            className="border-subtle bg-muted h-24 w-full rounded-md border p-2 text-sm text-gray-600"
            value={JSON.stringify(user.metadata)}
            disabled={true}
          />
        </div>
        <div>
          <Label>User JSON Object</Label>
          <textarea
            className="border-subtle bg-muted h-24 w-full rounded-md border p-2 text-sm text-gray-600"
            value={JSON.stringify(user)}
            disabled={true}
          />
        </div>
      </section>
    </div>
  );
};

export default UsersInvestigateView;
