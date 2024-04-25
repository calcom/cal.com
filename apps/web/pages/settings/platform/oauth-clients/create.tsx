import Shell from "@calcom/features/shell/Shell";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";

import PageWrapper from "@components/PageWrapper";
import { OAuthClientForm } from "@components/settings/platform/oauth-clients/oauth-client-form/create";

export default function CreateOAuthClient() {
  const searchParams = useCompatSearchParams();
  const clientId = searchParams?.get("clientId") || "";

  return (
    <div>
      <Shell title={`OAuth client ${!!clientId ? "updation" : "creation"} form`} isPlatformUser={true}>
        <div className="m-2 md:mx-14 md:mx-5">
          <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
            <div className="flex w-full flex-col">
              <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                OAuth client create form
              </h1>
              <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                This is the form to create a new OAuth client
              </p>
            </div>
          </div>
          <OAuthClientForm />
        </div>
      </Shell>
    </div>
  );
}

CreateOAuthClient.PageWrapper = PageWrapper;
