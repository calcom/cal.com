import type { ReactElement } from "react";
import React, { useState } from "react";

import { BookerEmbed } from "../booker-embed";
import { fetchDataOrRedirect } from "./useRouter";

export const Router = React.memo(
  ({
    formId,
    searchParams,
    onExternalRedirect,
    onDisplayBookerEmbed,
    renderMessage,
  }: {
    formId: string;
    searchParams?: URLSearchParams;
    onExternalRedirect?: () => void;
    onDisplayBookerEmbed?: () => void;
    renderMessage?: (message?: string) => ReactElement | ReactElement[];
  }) => {
    const [isLoading, setIsLoading] = useState<boolean>();
    const [routerUrl, setRouterUrl] = useState<string>();
    const [routingData, setRoutingData] = useState<
      { redirect?: string; data: undefined } | { data: { message: string }; redirect: undefined }
    >();
    const [isError, setIsError] = useState<boolean>();

    React.useEffect(() => {
      if (!isLoading) {
        setIsLoading(true);
        setIsError(false);
        fetchDataOrRedirect(formId, searchParams ?? new URLSearchParams({}))
          .then((response) => {
            console.log("THEN", response?.data?.redirect, response?.data);
            setRouterUrl(response?.data?.redirect);
            setRoutingData(response.data);
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

    const isRedirect = routingData?.redirect ?? false;

    console.log({ isLoading, isError, routerUrl, routingData });

    if (isLoading || isError) {
      return <></>;
    }

    if (!isLoading && isRedirect && routerUrl) {
      const redirectParams = new URLSearchParams(routerUrl);
      if (redirectParams.get("cal.action") === "eventTypeRedirectUrl") {
        // display booker with redirect URL
        onDisplayBookerEmbed?.();
        return <BookerEmbed routingFormUrl={routerUrl} />;
      } else if (redirectParams.get("cal.action") === "externalRedirectUrl") {
        onExternalRedirect?.();
        window.location.href = routerUrl;
        return <></>;
      }
    }

    if (!isRedirect && routingData?.data?.message) {
      if (renderMessage) {
        return <>{renderMessage(routingData?.data?.message)}</>;
      }
      return (
        <div className="mx-auto my-0 max-w-3xl md:my-24">
          <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
            <div className="text-default bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
              <div>{routingData?.data?.message}</div>
            </div>
          </div>
        </div>
      );
    }

    return <></>;
  }
);

Router.displayName = "RouterAtom";
