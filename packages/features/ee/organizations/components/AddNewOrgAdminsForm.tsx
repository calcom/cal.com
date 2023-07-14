import { ArrowRight } from "lucide-react";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast, TextAreaField, Form } from "@calcom/ui";

const querySchema = z.object({
  id: z.string().transform((val) => parseInt(val)),
});

export const AddNewOrgAdminsForm = () => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const { id: orgId } = querySchema.parse(router.query);
  const newAdminsFormMethods = useForm<{
    emails: string[];
  }>();
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      if (data.sendEmailInvitation) {
        if (Array.isArray(data.usernameOrEmail)) {
          showToast(
            t("email_invite_team_bulk", {
              userCount: data.usernameOrEmail.length,
            }),
            "success"
          );
        } else {
          showToast(
            t("email_invite_team", {
              email: data.usernameOrEmail,
            }),
            "success"
          );
        }
      }
      router.push(`/settings/organizations/${orgId}/add-teams`);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <Form
      form={newAdminsFormMethods}
      handleSubmit={(values) => {
        inviteMemberMutation.mutate({
          teamId: orgId,
          language: i18n.language,
          role: MembershipRole.ADMIN,
          usernameOrEmail: values.emails,
          sendEmailInvitation: true,
          isOrg: true,
        });
      }}>
      <div className="flex flex-col rounded-md">
        <Controller
          name="emails"
          control={newAdminsFormMethods.control}
          rules={{
            required: t("enter_email_or_username"),
          }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <>
              <TextAreaField
                name="emails"
                label="Invite via email"
                rows={4}
                autoCorrect="off"
                placeholder="john@doe.com, alex@smith.com"
                required
                value={value}
                onChange={(e) => {
                  const emails = e.target.value.split(",").map((email) => email.trim().toLocaleLowerCase());

                  return onChange(emails);
                }}
              />
              {error && <span className="text-sm text-red-800">{error.message}</span>}
            </>
          )}
        />
        <Button
          EndIcon={ArrowRight}
          color="primary"
          type="submit"
          className="mt-6 w-full justify-center"
          disabled={inviteMemberMutation.isLoading}>
          Continue
        </Button>
      </div>
    </Form>
  );
};
