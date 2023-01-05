import Head from "next/head";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import CustomBranding from "@calcom/lib/CustomBranding";
import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { trpc } from "@calcom/trpc/react";
import { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";
import { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, showToast } from "@calcom/ui";

import FormInputFields from "../../components/FormInputFields";
import { getSerializableForm } from "../../lib/getSerializableForm";
import { processRoute } from "../../lib/processRoute";
import { Response, Route } from "../../types/types";

function RoutingForm({ form, profile, ...restProps }: inferSSRProps<typeof getServerSideProps>) {
  const [customPageMessage, setCustomPageMessage] = useState<Route["action"]["value"]>("");
  const formFillerIdRef = useRef(uuidv4());
  const isEmbed = useIsEmbed(restProps.isEmbed);
  useTheme(profile.theme);
  // TODO: We might want to prevent spam from a single user by having same formFillerId across pageviews
  // But technically, a user can fill form multiple times due to any number of reasons and we currently can't differentiate b/w that.
  // - like a network error
  // - or he abandoned booking flow in between
  const formFillerId = formFillerIdRef.current;
  const decidedActionRef = useRef<Route["action"]>();
  const router = useRouter();

  const onSubmit = (response: Response) => {
    const decidedAction = processRoute({ form, response });

    if (!decidedAction) {
      // FIXME: Make sure that when a form is created, there is always a fallback route and then remove this.
      alert("Define atleast 1 route");
      return;
    }

    responseMutation.mutate({
      formId: form.id,
      formFillerId,
      response: response,
    });
    decidedActionRef.current = decidedAction;
  };

  useEffect(() => {
    // Custom Page doesn't actually change Route, so fake it so that embed can adjust the scroll to make the content visible
    sdkActionManager?.fire("__routeChanged", {});
  }, [customPageMessage]);

  const responseMutation = trpc.viewer.appRoutingForms.public.response.useMutation({
    onSuccess: () => {
      const decidedAction = decidedActionRef.current;
      if (!decidedAction) {
        return;
      }

      //TODO: Maybe take action after successful mutation
      if (decidedAction.type === "customPageMessage") {
        setCustomPageMessage(decidedAction.value);
      } else if (decidedAction.type === "eventTypeRedirectUrl") {
        router.push(`/${decidedAction.value}`);
      } else if (decidedAction.type === "externalRedirectUrl") {
        window.location.href = decidedAction.value;
      }
      // showToast("Form submitted successfully! Redirecting now ...", "success");
    },
    onError: (e) => {
      if (e?.message) {
        return void showToast(e?.message, "error");
      }
      if (e?.data?.code === "CONFLICT") {
        return void showToast("Form already submitted", "error");
      }
      // showToast("Something went wrong", "error");
    },
  });

  const [response, setResponse] = useState<Response>({});

  const handleOnSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(response);
  };

  const { t } = useLocale();

  return (
    <div>
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />

      <div>
        {!customPageMessage ? (
          <>
            <Head>
              <title>{`${form.name} | Cal.com Forms`}</title>
            </Head>
            <div className={classNames("mx-auto my-0 max-w-3xl", isEmbed ? "" : "md:my-24")}>
              <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
                <div className="main border-bookinglightest dark:bg-darkgray-100 sm:dark:border-darkgray-300 mx-0 rounded-md bg-white p-4 py-6 sm:-mx-4 sm:px-8 md:border">
                  <Toaster position="bottom-right" />

                  <form onSubmit={handleOnSubmit}>
                    <div className="mb-8">
                      <h1 className="font-cal mb-1 text-xl font-bold tracking-wide text-gray-900 dark:text-white">
                        {form.name}
                      </h1>
                      {form.description ? (
                        <p className="min-h-10 text-sm text-neutral-500 ltr:mr-4 rtl:ml-4 dark:text-white">
                          {form.description}
                        </p>
                      ) : null}
                    </div>
                    <FormInputFields form={form} response={response} setResponse={setResponse} />
                    <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                      <Button
                        className="dark:bg-darkmodebrand dark:text-darkmodebrandcontrast dark:hover:border-darkmodebrandcontrast dark:border-transparent"
                        loading={responseMutation.isLoading}
                        type="submit"
                        color="primary">
                        {t("submit")}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto my-0 max-w-3xl md:my-24">
            <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
              <div className="main dark:bg-darkgray-100 sm:dark:border-darkgray-300 -mx-4 rounded-md border border-neutral-200 bg-white p-4 py-6 sm:mx-0 sm:px-8">
                <div className="dark:text-white">{customPageMessage}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoutingLink(props: inferSSRProps<typeof getServerSideProps>) {
  return <RoutingForm {...props} />;
}

RoutingLink.isThemeSupported = true;

export const getServerSideProps = async function getServerSideProps(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma
) {
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 2) {
    return {
      notFound: true,
    };
  }
  const isEmbed = params.appPages[1] === "embed";

  const form = await prisma.app_RoutingForms_Form.findUnique({
    where: {
      id: formId,
    },
    include: {
      user: {
        select: {
          theme: true,
          brandColor: true,
          darkBrandColor: true,
        },
      },
    },
  });

  if (!form || form.disabled) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      isEmbed,
      profile: {
        theme: form.user.theme,
        brandColor: form.user.brandColor,
        darkBrandColor: form.user.darkBrandColor,
      },
      form: await getSerializableForm(form),
    },
  };
};
