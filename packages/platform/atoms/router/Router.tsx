import type { ReactElement } from "react";
import React, { useState } from "react";

import { BookerEmbed } from "../booker-embed";
import type { BookerPlatformWrapperAtomPropsForTeam } from "../booker/BookerPlatformWrapper";

export const Router = React.memo(
  ({
    formId,
    searchParams,
    onExternalRedirect,
    onDisplayBookerEmbed,
    renderMessage,
    bannerUrl,
    customClassNames,
  }: {
    formId: string;
    searchParams?: URLSearchParams;
    onExternalRedirect?: () => void;
    onDisplayBookerEmbed?: () => void;
    renderMessage?: (message?: string) => ReactElement | ReactElement[];
    bannerUrl?: BookerPlatformWrapperAtomPropsForTeam["bannerUrl"];
    customClassNames?: BookerPlatformWrapperAtomPropsForTeam["customClassNames"];
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
        fetch(`${baseUrl}/router/forms/${formId}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: searchParams ? JSON.stringify(Object.fromEntries(searchParams)) : undefined,
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
            console.log("CATCH", err);
            setIsError(true);
          })
          .finally(() => {
            console.log("FINNALY");
            setIsLoading(false);
          });
      }
    }, []);

    const isRedirect = !!routerUrl;

    console.log({ isLoading, isError, routerUrl, routingData });

    if (isLoading || isError) {
      return <></>;
    }

    if (!isLoading && isRedirect && routerUrl) {
      const redirectParams = new URLSearchParams(routerUrl);
      if (redirectParams.get("cal.action") === "eventTypeRedirectUrl") {
        // display booker with redirect URL
        onDisplayBookerEmbed?.();
        return (
          <BookerEmbed routingFormUrl={routerUrl} customClassNames={customClassNames} bannerUrl={bannerUrl} />
        );
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
