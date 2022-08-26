import { GetServerSidePropsContext } from "next";
import { TFunction } from "next-i18next";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/v2/core/Button";
import TimezoneSelect from "@calcom/ui/v2/core/TimezoneSelect";
import Select from "@calcom/ui/v2/core/form/Select";
import { Form, Label } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notfications";

import { withQuery } from "@lib/QueryCell";
import { getSession } from "@lib/auth";
import { nameOfDay } from "@lib/core/i18n/weekday";
import { inferSSRProps } from "@lib/types/inferSSRProps";

interface GeneralViewProps {
  localeProp: string;
  t: TFunction;
  user: {
    timeZone: string;
    timeFormat: number | null;
    weekStart: string;
  };
}

const WithQuery = withQuery(["viewer.public.i18n"], { context: { skipBatch: true } });

const GeneralQueryView = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();

  return <WithQuery success={({ data }) => <GeneralView localeProp={data.locale} t={t} {...props} />} />;
};

const GeneralView = ({ localeProp, t, user }: GeneralViewProps) => {
  const router = useRouter();

  // const { data: user, isLoading } = trpc.useQuery(["viewer.me"]);
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: () => {
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const localeOptions = useMemo(() => {
    return (router.locales || []).map((locale) => ({
      value: locale,
      label: new Intl.DisplayNames(localeProp, { type: "language" }).of(locale) || "",
    }));
  }, [localeProp, router.locales]);

  const timeFormatOptions = [
    { value: 12, label: t("12_hour") },
    { value: 24, label: t("24_hour") },
  ];

  const weekStartOptions = [
    { value: "Sunday", label: nameOfDay(localeProp, 0) },
    { value: "Monday", label: nameOfDay(localeProp, 1) },
    { value: "Tuesday", label: nameOfDay(localeProp, 2) },
    { value: "Wednesday", label: nameOfDay(localeProp, 3) },
    { value: "Thursday", label: nameOfDay(localeProp, 4) },
    { value: "Friday", label: nameOfDay(localeProp, 5) },
    { value: "Saturday", label: nameOfDay(localeProp, 6) },
  ];

  const formMethods = useForm({
    defaultValues: {
      locale: {
        value: localeProp || "",
        label: localeOptions.find((option) => option.value === localeProp)?.label || "",
      },
      timeZone: user?.timeZone || "",
      timeFormat: {
        value: user?.timeFormat || 12,
        label: timeFormatOptions.find((option) => option.value === user?.timeFormat)?.label || 12,
      },
      weekStart: {
        value: user?.weekStart,
        label: nameOfDay(localeProp, user?.weekStart === "Sunday" ? 0 : 1),
      },
    },
  });

  return (
    <Form
      form={formMethods}
      handleSubmit={(values) => {
        mutation.mutate({
          ...values,
          locale: values.locale.value,
          timeFormat: values.timeFormat.value,
          weekStart: values.weekStart.value,
        });
      }}>
      <Controller
        name="locale"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="mt-8 text-gray-900">
              <>{t("language")}</>
            </Label>
            <Select
              options={localeOptions}
              value={value}
              onChange={(event) => {
                if (event) formMethods.setValue("locale", { ...event });
              }}
            />
          </>
        )}
      />
      <Controller
        name="timeZone"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="mt-8 text-gray-900">
              <>{t("timezone")}</>
            </Label>
            <TimezoneSelect
              id="timezone"
              value={value}
              onChange={(event) => {
                if (event) formMethods.setValue("timeZone", event.value);
              }}
            />
          </>
        )}
      />
      <Controller
        name="timeFormat"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="mt-8 text-gray-900">
              <>{t("time_format")}</>
            </Label>
            <Select
              value={value}
              options={timeFormatOptions}
              onChange={(event) => {
                if (event) formMethods.setValue("timeFormat", { ...event });
              }}
            />
          </>
        )}
      />
      <Controller
        name="weekStart"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <>
            <Label className="mt-8 text-gray-900">
              <>{t("start_of_week")}</>
            </Label>
            <Select
              value={value}
              options={weekStartOptions}
              onChange={(event) => {
                if (event) formMethods.setValue("weekStart", { ...event });
              }}
            />
          </>
        )}
      />
      <Button color="primary" className="mt-8">
        <>{t("update")}</>
      </Button>
    </Form>
  );
};

GeneralQueryView.getLayout = getLayout;

export default GeneralQueryView;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      timeZone: true,
      timeFormat: true,
      weekStart: true,
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }

  return {
    props: {
      user,
    },
  };
};
