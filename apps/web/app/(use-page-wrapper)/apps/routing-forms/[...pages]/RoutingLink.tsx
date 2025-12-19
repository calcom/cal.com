"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

import FormInputFields from "@calcom/app-store/routing-forms/components/FormInputFields";
import { getAbsoluteEventTypeRedirectUrlWithEmbedSupport } from "@calcom/app-store/routing-forms/getEventTypeRedirectUrl";
import getFieldIdentifier from "@calcom/app-store/routing-forms/lib/getFieldIdentifier";
import { findMatchingRoute } from "@calcom/app-store/routing-forms/lib/processRoute";
import { substituteVariables } from "@calcom/app-store/routing-forms/lib/substituteVariables";
import { getFieldResponseForJsonLogic } from "@calcom/app-store/routing-forms/lib/transformResponse";
import type { NonRouterRoute, FormResponse } from "@calcom/app-store/routing-forms/types/types";
import { sdkActionManager, useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { getUrlSearchParamsToForward } from "@calcom/features/routing-forms/lib/getUrlSearchParamsToForward";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTMLClient } from "@calcom/lib/markdownToSafeHTMLClient";
import { navigateInTopWindow } from "@calcom/lib/navigateInTopWindow";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { useCalcomTheme } from "@calcom/ui/styles";
import type { getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsRoutingLink";

type Props = inferSSRProps<typeof getServerSideProps>;
const useBrandColors = ({
  brandColor,
  darkBrandColor,
}: {
  brandColor?: string | null;
  darkBrandColor?: string | null;
}) => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  useCalcomTheme(brandTheme);
};

function RoutingForm({ form, profile, ...restProps }: Props) {
  const [customPageMessage, setCustomPageMessage] = useState<NonRouterRoute["action"]["value"]>("");
  const formFillerIdRef = useRef(uuidv4());
  const isEmbed = useIsEmbed(restProps.isEmbed);
  useTheme(profile.theme);
  useBrandColors({
    brandColor: profile.brandColor,
    darkBrandColor: profile.darkBrandColor,
  });

  const [response, setResponse] = usePrefilledResponse(form);
  const pageSearchParams = useCompatSearchParams();
  const isBookingDryRun = pageSearchParams?.get("cal.isBookingDryRun") === "true";

  // TODO: We might want to prevent spam from a single user by having same formFillerId across pageviews
  // But technically, a user can fill form multiple times due to any number of reasons and we currently can't differentiate b/w that.
  // - like a network error
  // - or he abandoned booking flow in between
  const formFillerId = formFillerIdRef.current;
  const chosenRouteWithFormResponseRef = useRef<{
    route: NonRouterRoute;
    response: FormResponse;
  }>();
  const router = useRouter();

  const onSubmit = (response: FormResponse) => {
    const chosenRoute = findMatchingRoute({ form, response });

    if (!chosenRoute) {
      // This error should never happen as we ensure that fallback route is always there that matches always
      throw new Error("No matching route found");
    }

    responseMutation.mutate({
      formId: form.id,
      formFillerId,
      response: response,
      chosenRouteId: chosenRoute.id,
      isPreview: isBookingDryRun,
    });

    chosenRouteWithFormResponseRef.current = {
      route: chosenRoute,
      response,
    };
  };

  useEffect(() => {
    // Custom Page doesn't actually change Route, so fake it so that embed can adjust the scroll to make the content visible
    sdkActionManager?.fire("__routeChanged", {});
  }, [customPageMessage]);

  const responseMutation = trpc.viewer.routingForms.public.response.useMutation({
    onSuccess: async (data) => {
      const {
        teamMembersMatchingAttributeLogic,
        formResponse,
        queuedFormResponse,
        attributeRoutingConfig,
        crmContactOwnerEmail,
        crmContactOwnerRecordType,
        crmAppSlug,
      } = data;
      const chosenRouteWithFormResponse = chosenRouteWithFormResponseRef.current;
      if (!chosenRouteWithFormResponse) {
        return;
      }
      const fields = form.fields;
      if (!fields) {
        throw new Error("Routing Form fields must exist here");
      }
      const allURLSearchParams = getUrlSearchParamsToForward({
        formResponse: chosenRouteWithFormResponse.response,
        formResponseId: formResponse?.id ?? null,
        queuedFormResponseId: queuedFormResponse?.id ?? null,
        fields,
        searchParams: new URLSearchParams(window.location.search),
        teamMembersMatchingAttributeLogic,
        attributeRoutingConfig: attributeRoutingConfig ?? null,
        crmContactOwnerEmail,
        crmContactOwnerRecordType,
        crmAppSlug,
      });
      const chosenRoute = chosenRouteWithFormResponse.route;
      const decidedAction = chosenRoute.action;
      sdkActionManager?.fire("routed", {
        actionType: decidedAction.type,
        actionValue: decidedAction.value,
      });
      //TODO: Maybe take action after successful mutation
      if (decidedAction.type === "customPageMessage") {
        setCustomPageMessage(decidedAction.value);
      } else if (decidedAction.type === "eventTypeRedirectUrl") {
        const eventTypeUrlWithResolvedVariables = substituteVariables(decidedAction.value, response, fields);
        router.push(
          getAbsoluteEventTypeRedirectUrlWithEmbedSupport({
            form,
            eventTypeRedirectUrl: eventTypeUrlWithResolvedVariables,
            allURLSearchParams,
            isEmbed: !!isEmbed,
          })
        );
      } else if (decidedAction.type === "externalRedirectUrl") {
        navigateInTopWindow(`${decidedAction.value}?${allURLSearchParams}`);
      }
      // We don't want to show this message as it doesn't look good in Embed.
      // showToast("Form submitted successfully! Redirecting now ...", "success");
    },
    onError: (e) => {
      if (e?.message) {
        return void showToast(e?.message, "error");
      }
      if (e?.data?.code === "CONFLICT") {
        return void showToast("Form already submitted", "error");
      }
      // We don't want to show this error as it doesn't look good in Embed.
      // showToast("Something went wrong", "error");
    },
  });

  const handleOnSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(response);
  };

  const { t } = useLocale();

  return (
    <div>
      <div>
        {!customPageMessage ? (
          <>
            <div className={classNames("mx-auto my-0 max-w-3xl", isEmbed ? "" : "md:my-24")}>
              <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
                <div className="main border-booker md:border-booker-width dark:bg-cal-muted bg-default mx-0 rounded-md p-4 py-6 sm:-mx-4 sm:px-8 ">
                  <Toaster position="bottom-right" />

                  <form onSubmit={handleOnSubmit}>
                    <div className="mb-8">
                      <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold tracking-wide">
                        {form.name}
                      </h1>
                      {form.description ? (
                        <p className="min-h-10 text-subtle text-sm ltr:mr-4 rtl:ml-4">{form.description}</p>
                      ) : null}
                    </div>
                    <FormInputFields form={form} response={response} setResponse={setResponse} />
                    <div className="mt-4 flex justify-end space-x-2 rtl:space-x-reverse">
                      <Button
                        className="dark:bg-darkmodebrand dark:text-darkmodebrandcontrast dark:hover:border-darkmodebrandcontrast dark:border-transparent"
                        loading={responseMutation.isPending}
                        type="submit"
                        color="primary">
                        {t("continue")}
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
              <div className="main sm:border-subtle bg-default -mx-4 rounded-md border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
                <div
                  className="text-emphasis prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: markdownToSafeHTMLClient(customPageMessage) }}
                />
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

const usePrefilledResponse = (form: Props["form"]) => {
  const searchParams = useCompatSearchParams();
  const prefillResponse: FormResponse = {};

  // Prefill the form from query params
  form.fields?.forEach((field) => {
    const valuesFromQuery = searchParams?.getAll(getFieldIdentifier(field)).filter(Boolean) ?? [];
    // We only want to keep arrays if the field is a multi-select
    const value = valuesFromQuery.length > 1 ? valuesFromQuery : valuesFromQuery[0];

    prefillResponse[field.id] = {
      value: getFieldResponseForJsonLogic({ field, value }),
      label: field.label,
    };
  });
  const [response, setResponse] = useState<FormResponse>(prefillResponse);
  return [response, setResponse] as const;
};
