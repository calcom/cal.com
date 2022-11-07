import { useForm, Controller } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, Avatar } from "@calcom/ui/components";
import { Form, TextField } from "@calcom/ui/components/form";
import ImageUploader from "@calcom/ui/v2/core/ImageUploader";

import { NewTeamData, NewTeamFormValues } from "../../lib/types";

const CreateANewTeamForm = ({
  nextStep,
  newTeamData,
}: {
  nextStep: (values: NewTeamFormValues) => void;
  newTeamData: NewTeamData;
}) => {
  const { t } = useLocale();
  const newTeamFormMethods = useForm<NewTeamFormValues>({
    defaultValues: {
      name: newTeamData?.name || "",
      temporarySlug: newTeamData?.temporarySlug || "",
      logo: newTeamData?.logo || "",
    },
  });

  const validateTeamSlugQuery = trpc.useQuery(
    ["viewer.teams.validateTeamSlug", { temporarySlug: newTeamFormMethods.watch("temporarySlug") }],
    {
      enabled: false,
      refetchOnWindowFocus: false,
    }
  );

  const validateTeamSlug = async () => {
    await validateTeamSlugQuery.refetch();
    if (validateTeamSlugQuery.isFetched) return validateTeamSlugQuery.data || t("team_url_taken");
  };

  return (
    <>
      <Form
        form={newTeamFormMethods}
        handleSubmit={async (values) => {
          nextStep(values);
        }}>
        <div className="mb-8">
          <Controller
            name="name"
            control={newTeamFormMethods.control}
            defaultValue=""
            rules={{
              required: t("must_enter_team_name"),
            }}
            render={({ field: { value } }) => (
              <>
                <TextField
                  className="mt-2"
                  name="name"
                  label={t("team_name")}
                  value={value}
                  onChange={(e) => {
                    newTeamFormMethods.setValue("name", e?.target.value);
                    if (newTeamFormMethods.formState.touchedFields["temporarySlug"] === undefined) {
                      newTeamFormMethods.setValue("temporarySlug", slugify(e?.target.value));
                    }
                  }}
                  autoComplete="off"
                />
              </>
            )}
          />
        </div>

        <div className="mb-8">
          <Controller
            name="temporarySlug"
            control={newTeamFormMethods.control}
            rules={{ required: t("team_url_required"), validate: async () => await validateTeamSlug() }}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="temporarySlug"
                label={t("team_url")}
                addOnLeading={`${WEBAPP_URL}/team/`}
                value={value}
                onChange={(e) => {
                  newTeamFormMethods.setValue("temporarySlug", slugify(e?.target.value), {
                    shouldTouch: true,
                  });
                }}
              />
            )}
          />
        </div>
        <div className="mb-8">
          <Controller
            control={newTeamFormMethods.control}
            name="logo"
            render={({ field: { value } }) => (
              <div className="flex items-center">
                <Avatar alt="" imageSrc={value || null} gravatarFallbackMd5="newTeam" size="lg" />
                <div className="ml-4">
                  <ImageUploader
                    target="avatar"
                    id="avatar-upload"
                    buttonMsg={t("update")}
                    handleAvatarChange={(newAvatar: string) => {
                      newTeamFormMethods.setValue("logo", newAvatar);
                    }}
                    imageSrc={value}
                  />
                </div>
              </div>
            )}
          />
        </div>
        <div className="flex space-x-2">
          <Button color="secondary" href="/settings" className="w-full justify-center">
            {t("cancel")}
          </Button>
          <Button color="primary" type="submit" EndIcon={Icon.FiArrowRight} className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};

export default CreateANewTeamForm;
