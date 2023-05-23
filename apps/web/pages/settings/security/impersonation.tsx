import type { GetServerSidePropsContext } from "next";
import { useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Form, Label, Meta, showToast, Skeleton, Switch } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

import { ssrInit } from "@server/lib/ssr";

const ProfileImpersonationView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: user } = trpc.viewer.me.useQuery();
  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: () => {
      showToast(t("profile_updated_successfully"), "success");
      reset(getValues());
    },
    onSettled: () => {
      utils.viewer.me.invalidate();
    },
    onMutate: async ({ disableImpersonation }) => {
      await utils.viewer.me.cancel();
      const previousValue = utils.viewer.me.getData();

      if (previousValue && disableImpersonation) {
        utils.viewer.me.setData(undefined, { ...previousValue, disableImpersonation });
      }
      return { previousValue };
    },
    onError: (error, variables, context) => {
      if (context?.previousValue) {
        utils.viewer.me.setData(undefined, context.previousValue);
      }
      showToast(`${t("error")}, ${error.message}`, "error");
    },
  });

  const formMethods = useForm<{ disableImpersonation: boolean }>({
    defaultValues: {
      disableImpersonation: user?.disableImpersonation,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
    setValue,
    reset,
    getValues,
    watch,
  } = formMethods;

  const isDisabled = isSubmitting || !isDirty;
  return (
    <>
      <Meta title={t("impersonation")} description={t("impersonation_description")} />
      <Form
        form={formMethods}
        handleSubmit={({ disableImpersonation }) => {
          mutation.mutate({ disableImpersonation });
        }}>
        <div className="flex space-x-3">
          <Switch
            onCheckedChange={(e) => {
              setValue("disableImpersonation", !e, { shouldDirty: true });
            }}
            fitToHeight={true}
            checked={!watch("disableImpersonation")}
          />
          <div className="flex flex-col">
            <Skeleton as={Label} className="text-emphasis text-sm font-semibold leading-none">
              {t("user_impersonation_heading")}
            </Skeleton>
            <Skeleton as="p" className="text-default -mt-2 text-sm leading-normal">
              {t("user_impersonation_description")}
            </Skeleton>
          </div>
        </div>
        <Button color="primary" className="mt-8" type="submit" disabled={isDisabled}>
          {t("update")}
        </Button>
      </Form>
    </>
  );
};

ProfileImpersonationView.getLayout = getLayout;
ProfileImpersonationView.PageWrapper = PageWrapper;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  await ssr.viewer.me.prefetch();
  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default ProfileImpersonationView;
