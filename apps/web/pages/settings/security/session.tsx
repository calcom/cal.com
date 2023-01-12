import { GetServerSidePropsContext } from "next";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Button, Form, Meta, Select, SettingsToggle, showToast } from "@calcom/ui";

import { ssrInit } from "@server/lib/ssr";

const SessionConfigView = () => {
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
    onMutate: async ({ metadata }) => {
      await utils.viewer.me.cancel();
      const previousValue = utils.viewer.me.getData();
      const previousMetadata = userMetadata.parse(previousValue?.metadata);

      if (previousValue && metadata?.sessionTimeout) {
        utils.viewer.me.setData(undefined, {
          ...previousValue,
          metadata: { ...previousMetadata, sessionTimeout: metadata?.sessionTimeout },
        });
      }
      return { previousValue };
    },
    onError: (error, _, context) => {
      if (context?.previousValue) {
        utils.viewer.me.setData(undefined, context.previousValue);
      }
      showToast(`${t("error")}, ${error.message}`, "error");
    },
  });

  const formMethods = useForm<{ sessionTimeout: number | undefined }>({
    defaultValues: {
      sessionTimeout: user?.metadata?.sessionTimeout,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
    reset,
    getValues,
    setValue,
  } = formMethods;

  const [sessionState, setSessionState] = useState<number | undefined>(user?.metadata?.sessionTimeout);

  const isDisabled = isSubmitting || !isDirty;

  const timeoutOptions = [5, 10, 15].map((mins) => ({
    label: t("multiple_duration_mins", { count: mins }),
    value: mins,
  }));

  return (
    <>
      <Meta title={t("session")} description={t("session_description")} />
      <Form
        form={formMethods}
        className="w-auto"
        handleSubmit={({ sessionTimeout }) => {
          mutation.mutate({ metadata: { ...user?.metadata, sessionTimeout } });
        }}>
        <SettingsToggle
          title={t("session_timeout")}
          description={t("session_timeout_description")}
          checked={sessionState !== undefined}
          data-testid="session-check"
          onCheckedChange={(e) => {
            if (!e) {
              setValue("sessionTimeout", undefined, { shouldDirty: true });
              setSessionState(undefined);
            } else {
              setValue("sessionTimeout", 10, { shouldDirty: true });
              setSessionState(10);
            }
          }}
        />
        {sessionState && (
          <div data-testid="session-collapsible" className="mt-4 text-sm">
            <div className="flex items-center">
              <p className="text-neutral-900 ltr:mr-2 rtl:ml-2">{t("session_timeout_after")}</p>
              <Select
                options={timeoutOptions}
                defaultValue={timeoutOptions[1]}
                isSearchable={false}
                className="block h-[36px] !w-auto min-w-0 flex-none rounded-md text-sm"
                onChange={(event) => {
                  setValue("sessionTimeout", event?.value, { shouldDirty: true });
                  setSessionState(event?.value);
                }}
              />
            </div>
          </div>
        )}
        <Button color="primary" className="mt-8" type="submit" disabled={isDisabled}>
          {t("update")}
        </Button>
      </Form>
    </>
  );
};

SessionConfigView.getLayout = getLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  await ssr.viewer.me.prefetch();
  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default SessionConfigView;
