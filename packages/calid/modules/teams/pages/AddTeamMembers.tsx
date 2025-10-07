"use client";

import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import React from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";

type TeamMember = RouterOutputs["viewer"]["calidTeams"]["listMembers"]["members"][number];

type MembershipRoleOption = {
  value: MembershipRole;
  label: string;
};

type InviteFormValues = {
  email: string;
  role: MembershipRole;
};

const AddTeamMembers = () => {
  const { t, i18n } = useLocale();
  const params = useParamsWithFallback();
  const router = useRouter();

  const teamId = Number(params.id);

  const utils = trpc.useUtils();

  const _teamQuery = trpc.viewer.teams.get.useQuery(
    { teamId },
    { enabled: Number.isFinite(teamId) && teamId > 0 }
  );

  type ListMembersPage = RouterOutputs["viewer"]["calidTeams"]["listMembers"];

  const membersQuery = trpc.viewer.calidTeams.listMembers.useQuery(
    { teamId, limit: 10 },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    }
  );

  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);

  const inviteMutation = trpc.viewer.calidTeams.inviteMember.useMutation({
    async onSuccess(data) {
      await Promise.all([
        utils.viewer.calidTeams.get.invalidate(),
        utils.viewer.calidTeams.listMembers.invalidate(),
      ]);
      if (Array.isArray(data.results) && data.results.length > 1) {
        triggerToast(
          t("email_invite_team_bulk", {
            userCount: data.results.length,
          }),
          "success"
        );
      } else if (data.results.length === 1) {
        triggerToast(
          t("email_invite_team", {
            email: data.results[0].email,
          }),
          "success"
        );
      }
      formMethods.reset({ email: "", role: MembershipRole.MEMBER });
    },
    onError(error) {
      triggerToast(error.message, "error");
    },
  });

  const removeMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await Promise.all([utils.viewer.teams.get.invalidate(), utils.viewer.teams.listMembers.invalidate()]);
      triggerToast(t("member_removed_successfully"), "success");
    },
    onError(error) {
      triggerToast(error.message, "error");
    },
  });

  const formMethods = useForm<InviteFormValues>({
    defaultValues: { email: "", role: MembershipRole.MEMBER },
  });

  const options: MembershipRoleOption[] = useMemo(() => {
    const options: MembershipRoleOption[] = [
      { value: MembershipRole.MEMBER, label: t("member") },
      { value: MembershipRole.ADMIN, label: t("admin") },
      { value: MembershipRole.OWNER, label: t("owner") },
    ];

    return options;
  }, [t]);

  if (!Number.isFinite(teamId) || teamId <= 0) return null;

  return (
    <div>
      <div>
        <h3 className="mb-4 text-base font-semibold">{t("team_members")}</h3>
        {members.length === 0 ? (
          <p className="text-default text-sm">{t("no_members_yet")}</p>
        ) : (
          <ul className="">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.user.name || member.user.email}</p>
                  <p className="text-default truncate text-xs">
                    {member.user.email} {member.role ? `• ${member.role}` : ""}
                  </p>
                </div>
                <Button
                  color="secondary"
                  onClick={() =>
                    removeMutation.mutate({ teamIds: [teamId], memberIds: [member.id], isOrg: false })
                  }
                  disabled={removeMutation.isPending || member.role === "OWNER"}
                  data-testid="remove-member-button">
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {membersQuery.data?.nextPaging && (
          <div className="mt-3 text-center">
            <Button
              color="minimal"
              onClick={() => {
                // For now, we'll just refetch the query
                // In a real implementation, you might want to implement proper pagination
                membersQuery.refetch();
              }}
              disabled={membersQuery.isFetching}>
              {t("load_more_results")}
            </Button>
          </div>
        )}
      </div>
      <hr className="my-6" />
      <div>
        <h3 className="mb-4 text-base font-semibold">{t("add_team_member")}</h3>
        <Form<InviteFormValues>
          form={formMethods}
          onSubmit={(values) => {
            if (!inviteMutation.isPending) {
              inviteMutation.mutate({
                teamId,
                language: i18n.language,
                role: values.role,
                usernameOrEmail: values.email.trim().toLowerCase(),
                creationSource: CreationSource.WEBAPP,
              });
            }
          }}>
          <div className="flex justify-between space-x-2">
            <div className="mt-1.5 w-full">
              <Controller
                name="email"
                control={formMethods.control}
                rules={{
                  required: t("enter_email") as unknown as string,
                  validate: (value) => /.+@.+\..+/.test(value) || (t("enter_email") as unknown as string),
                }}
                render={({ field: { onChange, value } }) => (
                  <TextField
                    name="email"
                    className="border-subtle py-5"
                    label={t("email")}
                    placeholder="email@example.com"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                  />
                )}
              />
            </div>
            <div className="w-1/3">
              <Controller
                name="role"
                control={formMethods.control}
                defaultValue={options[0].value}
                render={({ field: { onChange } }) => (
                  <div>
                    <label className="mb-2 block text-sm font-medium">{t("invite_as")}</label>
                    <Select
                      id="role"
                      defaultValue={options[0]}
                      options={options}
                      onChange={(val) => {
                        if (val) onChange(val.value);
                      }}
                    />
                  </div>
                )}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              color="primary"
              className="w-full justify-center"
              type="submit"
              disabled={inviteMutation.isPending}
              data-testid="invite-new-member-button">
              {t("send_invite")}
            </Button>
          </div>
        </Form>
      </div>

      <hr className="my-6" />
      <Button
        color="primary"
        className="w-full justify-center"
        onClick={() => router.push(`/settings/teams/${teamId}/event-type`)}>
        {t("continue")}
      </Button>
    </div>
  );
};

export default AddTeamMembers;
