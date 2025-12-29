"use client";

import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form";
import { TextField } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import React from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/components/form";

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
      if (
        data &&
        "results" in data &&
        data.results &&
        Array.isArray(data.results) &&
        data.results.length > 0
      ) {
        if (data.results.length > 1) {
          triggerToast(
            t("email_invite_team_bulk", {
              userCount: data.results.length,
            }),
            "success"
          );
        } else {
          const firstResult = data.results[0];
          if (firstResult && typeof firstResult === "object" && "email" in firstResult) {
            triggerToast(
              t("email_invite_team", {
                email: String(firstResult.email),
              }),
              "success"
            );
          }
        }
      }
      formMethods.reset({ email: "", role: MembershipRole.MEMBER });
    },
    onError(error) {
      triggerToast(error.message, "error");
    },
  });

  const removeMutation = trpc.viewer.calidTeams.removeMember.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.viewer.calidTeams.get.invalidate(),
        utils.viewer.calidTeams.listMembers.invalidate(),
      ]);
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
              <li key={member.id} className="flex items-end justify-between py-2">
                <div className="mr-2 min-w-0">
                  <p className="truncate text-sm font-medium">{member.user.name || member.user.email}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-default truncate text-xs">{member.user.email}</p>
                    <Badge size="sm" variant="secondary">
                      {member.role ? `${member.role}` : ""}
                    </Badge>
                  </div>
                </div>
                <Button
                  color="destructive"
                  variant="icon"
                  size="sm"
                  StartIcon="trash-2"
                  onClick={() => removeMutation.mutate({ teamIds: [teamId], memberIds: [member.user.id] })}
                  disabled={removeMutation.isPending || member.role === "OWNER"}
                  data-testid="remove-member-button"
                />
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
              });
            }
          }}>
          <div className="flex flex-col gap-2 md:flex-row md:justify-between md:space-x-2">
            <div className="w-full md:flex-1">
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
                    className="border-subtle"
                    label={t("email")}
                    placeholder="email@example.com"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                  />
                )}
              />
            </div>
            <div className="w-full">
              <Controller
                name="role"
                control={formMethods.control}
                defaultValue={options[0].value}
                render={({ field: { onChange } }) => (
                  <div>
                    <Label>{t("invite_as")}</Label>
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
