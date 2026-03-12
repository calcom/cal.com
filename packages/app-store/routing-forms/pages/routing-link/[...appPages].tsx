"use client";

import { triggerToast } from "@calid/features/ui/components/toast";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { sdkActionManager, useIsEmbed } from "@calid/embed-runtime/embed-iframe";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import useTheme from "@calcom/lib/hooks/useTheme";
import { navigateInTopWindow } from "@calcom/lib/navigateInTopWindow";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import classNames from "@calcom/ui/classNames";
import { useCalcomTheme } from "@calcom/ui/styles";

import { getValidationErrorMessage } from "../../components/FormInputFields";
import RoutingFormRenderer from "../../components/RoutingFormRenderer";
import { getAbsoluteEventTypeRedirectUrlWithEmbedSupport } from "../../getEventTypeRedirectUrl";
import getFieldIdentifier from "../../lib/getFieldIdentifier";
import { findMatchingRoute } from "../../lib/processRoute";
import { substituteVariables } from "../../lib/substituteVariables";
import { getFieldResponseForJsonLogic } from "../../lib/transformResponse";
import type { NonRouterRoute, FormResponse } from "../../types/types";
import type { getServerSideProps } from "./getServerSideProps";
import { getUrlSearchParamsToForward } from "./getUrlSearchParamsToForward";

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
  const [showErrors, setShowErrors] = useState(false);
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
      // triggerToast("Form submitted successfully! Redirecting now ...", "success");
    },
    onError: (e) => {
      if (e?.message) {
        return void triggerToast(e?.message, "error");
      }
      if (e?.data?.code === "CONFLICT") {
        return void triggerToast("Form already submitted", "error");
      }
      // We don't want to show this error as it doesn't look good in Embed.
      // triggerToast("Something went wrong", "error");
    },
  });

  const handleOnSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowErrors(true);
    const hasErrors =
      form.fields?.some((field) => {
        const value = response[field.id]?.value ?? "";
        return !!getValidationErrorMessage(field, value);
      }) ?? false;
    if (hasErrors) {
      return;
    }
    onSubmit(response);
  };

  return (
    <div className={classNames("min-h-screen w-full", isEmbed ? "" : "md:min-h-screen")}>
      <link rel="stylesheet" href="https://use.typekit.net/axv4sxn.css" />

      {!customPageMessage ? (
        <>
          <Toaster position="bottom-right" />
          <form onSubmit={handleOnSubmit} className="min-h-screen w-full">
            <RoutingFormRenderer
              form={form}
              response={response}
              setResponse={setResponse}
              submitLoading={responseMutation.isPending}
              submitDisabled={responseMutation.isPending}
              showErrors={showErrors}
              className="min-h-screen w-full"
            />
          </form>
        </>
      ) : (
        <div className="min-h-screen w-full">
          <div className="mx-auto my-0 max-w-3xl md:my-24">
            <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
              <div className="main sm:border-subtle bg-default -mx-4 rounded-md border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
                <div className="text-emphasis">{customPageMessage}</div>
              </div>
            </div>
          </div>
        </div>
      )}
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
