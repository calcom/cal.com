import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";
import { Controller, useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import objectKeys from "@calcom/lib/objectKeys";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, Dialog, DialogTrigger, Form, showToast, TextField } from "@calcom/ui/v2/core";
import Avatar from "@calcom/ui/v2/core/Avatar";
import ConfirmationDialogContent from "@calcom/ui/v2/core/ConfirmationDialogContent";
import Meta from "@calcom/ui/v2/core/Meta";
import { Label, TextArea } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

import ImageUploader from "@components/v2/settings/ImageUploader";

interface TeamProfileValues {
  name: string;
  url: string;
  logo: string;
  bio: string;
}

const ProfileView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();

  const mutation = trpc.useMutation("viewer.teams.update", {
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const form = useForm<TeamProfileValues>();

  const { data: team } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: () => {
      router.push("/settings");
    },
    onSuccess: (team) => {
      if (team) {
        form.setValue("name", team.name || "");
        form.setValue("url", team.slug || "");
        form.setValue("logo", team.logo || "");
        form.setValue("bio", team.bio || "");
      }
    },
  });

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      <Meta title="booking_appearance" description="appearance_team_description" />
      {isAdmin ? (
        <Form
          form={form}
          handleSubmit={(values) => {
            if (team) {
              console.log("handle submit");
            }
          }}>
          <Button color="primary" className="mt-8" type="submit" loading={mutation.isLoading}>
            {t("update")}
          </Button>
        </Form>
      ) : (
        <div className="rounded-md border border-gray-200 p-5">
          <span className="text-sm text-gray-600">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

ProfileView.getLayout = getLayout;

export default ProfileView;
