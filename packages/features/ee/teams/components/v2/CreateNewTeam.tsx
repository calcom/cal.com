import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import { Button, Avatar } from "@calcom/ui/v2";
import ImageUploader from "@calcom/ui/v2/core/ImageUploader";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";

import { NewTeamFormValues } from "../../lib/types";

const CreateANewTeamForm = (props: { nextStep: (values: NewTeamFormValues) => void }) => {
  const { t } = useLocale();
  const storedTeamData = localStorage.getItem("newTeamValues")
    ? JSON.parse(localStorage.getItem("newTeamValues"))
    : "";
  const newTeamFormMethods = useForm<NewTeamFormValues>({
    defaultValues: {
      name: storedTeamData?.name || "",
      slug: storedTeamData?.slug || "",
      logo: storedTeamData?.avatar || "",
    },
  });

  const validateTeamNameQuery = trpc.useQuery(
    ["viewer.teams.validateTeamName", { name: newTeamFormMethods.watch("name") }],
    {
      enabled: false,
      refetchOnWindowFocus: false,
    }
  );

  const validateTeamName = async () => {
    await validateTeamNameQuery.refetch();
    return validateTeamNameQuery.data || t("team_name_taken");
  };

  const validateTeamSlugQuery = trpc.useQuery(
    ["viewer.teams.validateTeamSlug", { slug: newTeamFormMethods.watch("slug") }],
    {
      enabled: false,
      refetchOnWindowFocus: false,
    }
  );

  const validateTeamSlug = async () => {
    await validateTeamSlugQuery.refetch();
    return validateTeamSlugQuery.data || t("team_url_taken");
  };

  return (
    <>
      <Form
        form={newTeamFormMethods}
        handleSubmit={(values) => {
          props.nextStep(values);
        }}>
        <div className="mb-8">
          <Controller
            name="name"
            control={newTeamFormMethods.control}
            defaultValue=""
            rules={{
              validate: async () => validateTeamName(),
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
                    if (newTeamFormMethods.formState.touchedFields["slug"] === undefined) {
                      newTeamFormMethods.setValue("slug", slugify(e?.target.value));
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
            name="slug"
            control={newTeamFormMethods.control}
            rules={{ required: t("team_url_required"), validate: async () => validateTeamSlug() }}
            render={({ field: { value } }) => (
              <TextField
                className="mt-2"
                name="slug"
                label={t("team_url")}
                addOnLeading={`${WEBAPP_URL}/team/`}
                value={value}
                onChange={(e) => {
                  newTeamFormMethods.setValue("slug", slugify(e?.target.value), { shouldTouch: true });
                }}
              />
            )}
          />
        </div>
        <div className="mb-8">
          <Controller
            control={newTeamFormMethods.control}
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
                      newTeamFormMethods.setValue("avatar", newAvatar);
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
          <Button
            color="primary"
            type="submit"
            // onClick={() => {
            //   console.log(newTeamFormMethods.getValues());
            //   props.nextStep();
            // }}
            EndIcon={Icon.FiArrowRight}
            className="w-full justify-center">
            {t("continue")}
          </Button>
        </div>
      </Form>
    </>
  );
};

export default CreateANewTeamForm;
