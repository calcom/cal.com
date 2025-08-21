"use client";

import React, { useMemo, useState } from "react";
import type { Dispatch } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { toast } from "@calid/features/ui/components/toast/use-toast";

import type { ComponentAction, ComponentState } from "./MembersList";

type Props = {
  state: ComponentState;
  dispatch: Dispatch<ComponentAction>;
  currentMember: MembershipRole;
  teamId: number;
};

export function EditMemberSheet({ state, dispatch, currentMember, teamId }: Props) {
  const { t } = useLocale();
  const selected = state.editSheet.user;
  if (!selected) return null;

  const utils = trpc.useUtils();

  // Fetch custom roles (PBAC). If none, we will fall back to standard roles
  const rolesQuery = trpc.viewer.pbac.getTeamRoles.useQuery(
    { teamId },
    { enabled: !!teamId, retry: false }
  );

  const hasCustomRoles = (rolesQuery.data?.length ?? 0) > 0;

  const roleOptions = useMemo(() => {
    if (hasCustomRoles) {
      return (rolesQuery.data ?? []).map((r) => ({ label: r.name, value: r.id }));
    }
    const base = [
      { label: t("member"), value: MembershipRole.MEMBER },
      { label: t("admin"), value: MembershipRole.ADMIN },
      { label: t("owner"), value: MembershipRole.OWNER },
    ];
    // Only show OWNER if the current viewer is also an OWNER
    return base.filter((opt) => opt.value !== MembershipRole.OWNER || currentMember === MembershipRole.OWNER);
  }, [hasCustomRoles, rolesQuery.data, t, currentMember]);

  const initialRole = (selected.customRoleId as string | undefined) ?? (selected.role as string);
  const [role, setRole] = useState<string>(initialRole);

  // Show user's connected apps (icons)
  const appsQuery = trpc.viewer.teams.getUserConnectedApps.useQuery({
    userIds: [selected.id],
    teamId,
  });
  const connectedApps = appsQuery.data?.[selected.id] ?? [];

  const changeRole = trpc.viewer.teams.changeMemberRole.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.viewer.teams.get.invalidate(),
        utils.viewer.teams.listMembers.invalidate(),
      ]);
      toast({ title: t("profile_updated_successfully") });
      dispatch({ type: "CLOSE_MODAL" });
    },
    onError(error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    },
  });

  const canSave = role && role !== initialRole && !changeRole.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && dispatch({ type: "CLOSE_MODAL" })}>
      <DialogContent className="p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle>{t("edit")}</DialogTitle>
          <DialogDescription>
            {selected.name || selected.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-4">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-emphasis">{t("profile")}</h3>
            <div className="text-sm text-subtle">
              <div className="truncate">{t("email")}: {selected.email}</div>
              {selected.username && selected.bookerUrl && (
                <div className="truncate">
                  {t("cal_link")}: {selected.bookerUrl.replace(/^https?:\/\//, "")}/{selected.username}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-sm font-medium text-emphasis" htmlFor="role">
              {t("role")}
            </label>
            {hasCustomRoles ? (
              <select
                id="role"
                className="w-full rounded-md border border-subtle bg-white p-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={rolesQuery.isPending}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value as string} value={opt.value as string}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                {roleOptions.map((opt) => (
                  <Button
                    key={String(opt.value)}
                    color={role === opt.value ? "primary" : "secondary"}
                    onClick={() => setRole(String(opt.value))}
                    type="button"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-emphasis">{t("apps")}</h3>
            {appsQuery.isPending ? (
              <div className="text-sm text-subtle">{t("loading")}</div>
            ) : connectedApps.length === 0 ? (
              <div className="text-sm text-subtle">{t("user_has_no_app_installed")}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connectedApps.map(({ logo, name }) =>
                  logo ? (
                    <img key={logo} src={logo} alt={`${name} logo`} className="h-5 w-5" />
                  ) : null
                )}
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="border-t p-4">
          <Button color="secondary" onClick={() => dispatch({ type: "CLOSE_MODAL" })}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            loading={changeRole.isPending}
            disabled={!canSave}
            onClick={() =>
              changeRole.mutate({ teamId, memberId: selected.id, role })
            }>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


