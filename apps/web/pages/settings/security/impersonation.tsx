import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  getSettingsLayout as getLayout,
  Label,
  Meta,
  showToast,
  Skeleton,
  Switch,
} from "@calcom/ui";

const ProfileImpersonationView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: user } = trpc.viewer.me.useQuery();
  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("profile_updated_successfully"), "success");
    },
    onError: (error) => {
      showToast(`${t("error")}, ${error.message}`, "error");
    },
  });

  const formMethods = useForm<{ disableImpersonation: boolean }>({
    defaultValues: {
      disableImpersonation: user?.disableImpersonation,
    },
  });

  const {
    formState: { isSubmitting },
    setValue,
  } = formMethods;

  return (
    <>
      <Meta title="Impersonation Settings" description="" />
      <Form
        form={formMethods}
        handleSubmit={({ disableImpersonation }) => {
          mutation.mutate({ disableImpersonation });
          utils.viewer.me.invalidate();
        }}>
        <div className="flex space-x-3">
          <Switch
            {...formMethods.register("disableImpersonation")}
            defaultChecked={!user?.disableImpersonation}
            onCheckedChange={(e) => {
              setValue("disableImpersonation", !e);
            }}
            fitToHeight={true}
          />
          <div className="flex flex-col">
            <Skeleton as={Label} className="text-sm font-semibold leading-none text-black">
              {t("user_impersonation_heading")}
            </Skeleton>
            <Skeleton as="p" className="-mt-2 text-sm leading-normal text-gray-600">
              {t("user_impersonation_description")}
            </Skeleton>
          </div>
        </div>
        <Button color="primary" className="mt-8" type="submit" disabled={isSubmitting || mutation.isLoading}>
          {t("update")}
        </Button>
      </Form>
    </>
  );
};

ProfileImpersonationView.getLayout = getLayout;

export default ProfileImpersonationView;
