import type { ReactElement } from "react";
import React, { useState } from "react";

import { BookerEmbed } from "../booker-embed";
import type { BookerPlatformWrapperAtomPropsForTeam } from "../booker/types";

/**
 * Renders the Router component with predefined props.
 * Depending on the routing form either renders a custom message, redirects or display Booker embed atom.
 * formResponsesURLParams contains the answers to the questions fields defined in the form.
 * ```tsx
 * <Router
 *   formId="1a1a1a1a-2b2b-3c3c-4d4d-5e5e5e5e5e5e"
 *   formResponsesURLParams={new URLSearchParams({ Territory: "Europe" })}
 *   bookerProps={{
 *    customClassNames: { bookerWrapper: "dark" },
 *    bannerUrl: "https://i0.wp.com/mahala.co.uk/wp-content/uploads/2014/12/img_banner-thin_mountains.jpg?fit=800%2C258&ssl=1",
 *    onCreateBookingSuccess: (data) => console.log(data),
 *    onCreateBookingError: (err) => console.error(err)
 * />
 * ```
 */

export const Router = React.memo(
  ({
    formId,
    formResponsesURLParams,
    onExternalRedirect,
    onDisplayBookerEmbed,
    renderMessage,
    onSubmitFormStart,
    onSubmitFormEnd,
    renderLoader,
    bookerProps,
  }: {
    formId: string;
    formResponsesURLParams?: URLSearchParams;
    onExternalRedirect?: () => void;
    onDisplayBookerEmbed?: () => void;
    onSubmitFormStart?: () => void;
    onSubmitFormEnd?: () => void;
    renderMessage?: (message?: string) => ReactElement | ReactElement[];
    bookerProps?: Pick<
      Partial<BookerPlatformWrapperAtomPropsForTeam>,
      | "customClassNames"
      | "bannerUrl"
      | "onCreateBookingSuccess"
      | "onCreateBookingError"
      | "onCreateRecurringBookingSuccess"
      | "onCreateRecurringBookingError"
      | "onReserveSlotSuccess"
      | "onReserveSlotError"
      | "onDeleteSlotSuccess"
      | "onDeleteSlotError"
      | "view"
      | "onDryRunSuccess"
      | "hostsLimit"
      | "metadata"
      | "handleCreateBooking"
      | "handleSlotReservation"
      | "preventEventTypeRedirect"
    >;
    renderLoader?: (isLoading?: boolean) => ReactElement | ReactElement[];
  }) => {
    const [isLoading, setIsLoading] = useState<boolean>();
    const [routerUrl, setRouterUrl] = useState<string>();
    const [routingData, setRoutingData] = useState<{ message: string } | undefined>();
    const [isError, setIsError] = useState<boolean>();

    React.useEffect(() => {
      if (!isLoading) {
        setIsLoading(true);
        setIsError(false);
        setRoutingData(undefined);
        setRouterUrl("");

        const baseUrl = import.meta.env.VITE_BOOKER_EMBED_API_URL;
        onSubmitFormStart?.();
        fetch(`${baseUrl}/router/forms/${formId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: formResponsesURLParams
            ? JSON.stringify(Object.fromEntries(formResponsesURLParams))
            : undefined,
        })
          .then(async (response) => {
            const body:
              | { status: string; data: string; redirect: true }
              | { status: string; data: { message: string }; redirect: false } = await response.json();
            if (body.redirect) {
              setRouterUrl(body.data);
            } else {
              setRoutingData({ message: body.data?.message ?? "" });
            }
          })
          .catch((err) => {
            console.error(err);
            setIsError(true);
          })
          .finally(() => {
            setIsLoading(false);
            onSubmitFormEnd?.();
          });
      }
    }, []);

    const isRedirect = !!routerUrl;

    if (isLoading && renderLoader) {
      return <>{renderLoader?.(isLoading)}</>;
    }

    if (isLoading || isError) {
      return <></>;
    }

    if (!isLoading && isRedirect && routerUrl) {
      const redirectParams = new URLSearchParams(routerUrl);
      if (redirectParams.get("cal.action") === "eventTypeRedirectUrl") {
        // display booker with redirect URL
        onDisplayBookerEmbed?.();
        return <BookerEmbed routingFormUrl={routerUrl} {...bookerProps} />;
      } else if (redirectParams.get("cal.action") === "externalRedirectUrl") {
        onExternalRedirect?.();
        window.location.href = routerUrl;
        return <></>;
      }
    }

    if (!isRedirect && routingData?.message) {
      if (renderMessage) {
        return <>{renderMessage(routingData?.message)}</>;
      }
      return (
        <div className="mx-auto my-0 max-w-3xl md:my-24">
          <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
            <div className="text-default bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
              <div>{routingData?.message}</div>
            </div>
          </div>
        </div>
      );
    }

    return <></>;
  }
);

Router.displayName = "RouterAtom";
