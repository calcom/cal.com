import { useForm, Controller } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, showToast, Avatar } from "@calcom/ui/v2";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";

import ImageUploader from "@components/v2/settings/ImageUploader";

const CreateANewTeamForm = (props: { nextStep: () => void; setTeamId: (teamId: number) => void }) => {
  const { t } = useLocale();

  const createTeamMutation = trpc.useMutation("viewer.teams.create", {
    onSuccess(data) {
      props.setTeamId(data.id);
    },
    onSettled() {
      props.nextStep();
    },
  });

  const formMethods = useForm();

  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => {
        createTeamMutation.mutate({
          name: values.name,
          slug: values.slug || null,
          logo: values.logo || null,
        });
      }}>
      <div className="mb-8">
        <Controller
          name="name"
          control={formMethods.control}
          rules={{ required: { value: true, message: t("team_name_required") } }}
          render={({ field: { value } }) => (
            <TextField
              className="mt-2"
              name="name"
              label={t("team_name")}
              value={value}
              onChange={(e) => {
                formMethods.setValue("name", e?.target.value);
              }}
            />
          )}
        />
      </div>

      <div className="mb-8">
        <Controller
          name="slug"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <TextField
              className="mt-2"
              name="slug"
              label={t("team_url")}
              addOnLeading={`${WEBAPP_URL}/`}
              value={value}
              onChange={(e) => {
                formMethods.setValue("slug", e?.target.value);
              }}
            />
          )}
        />
      </div>
      <div className="mb-8">
        <Controller
          control={formMethods.control}
          name="avatar"
          render={({ field: { value } }) => (
            <div className="flex items-center">
              <Avatar alt="" imageSrc={value || null} gravatarFallbackMd5="newTeam" size="lg" />
              <div className="ml-4">
                <ImageUploader
                  target="avatar"
                  id="avatar-upload"
                  buttonMsg={t("update")}
                  handleAvatarChange={(newAvatar: string) => {
                    formMethods.setValue("avatar", newAvatar);
                  }}
                  imageSrc={value}
                />
              </div>
            </div>
          )}
        />
      </div>
      <Button type="submit" EndIcon={Icon.FiArrowRight} className="w-full justify-center">
        {t("continue")}
      </Button>
      {createTeamMutation.isError && <p className="mt-4 text-red-700">{createTeamMutation.error.message}</p>}
    </Form>
  );
};

export default CreateANewTeamForm;
