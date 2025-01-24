import React, { useState } from "react";

import { BookerEmbed } from "../booker-embed";
import { fetchDataOrRedirect } from "./useRouter";

export const Router = React.memo(({ url }: { url: string }) => {
  const [isLoading, setIsLoading] = useState<boolean>();
  const [routerUrl, setRouterUrl] = useState<string>();
  const [routingData, setRoutingData] = useState<any>();
  const [isError, setIsError] = useState<boolean>();

  React.useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    fetchDataOrRedirect(url)
      .then((response) => {
        console.log("THEN", response.redirect, response.data);
        setRouterUrl(response.redirect);
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
  }, [url]);

  const isRedirect = routingData?.redirect ?? false;

  console.log({ isLoading, isError, routerUrl, routingData });

  if (isLoading || isError) {
    return <></>;
  }

  if (!isLoading && isRedirect && routerUrl) {
    const redirectParams = new URLSearchParams(routerUrl);

    if (redirectParams.get("action") === "eventTypeRedirectUrl") {
      // display booker with redirect URL
      return <BookerEmbed routingFormUrl={routerUrl} />;
    } else {
      window.location.href = routerUrl;
      return <></>;
    }
  }

  if (!isRedirect && routingData?.data?.message) {
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
});

Router.displayName = "RouterAtom";
