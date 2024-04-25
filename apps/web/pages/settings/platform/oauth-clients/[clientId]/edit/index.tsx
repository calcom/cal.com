import { useParams } from "next/navigation";

import Shell from "@calcom/features/shell/Shell";

import PageWrapper from "@components/PageWrapper";
import { EditOAuthClientForm } from "@components/settings/platform/oauth-clients/oauth-client-form/edit";

export default function EditOAuthClient() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId || "";

  return (
    <div>
      <Shell title="OAuth client updation form" isPlatformUser={true}>
        <div className="m-2 md:mx-14 md:mx-5">
          <div className="border-subtle mx-auto block justify-between rounded-t-lg border px-4 py-6 sm:flex sm:px-6">
            <div className="flex w-full flex-col">
              <h1 className="font-cal text-emphasis mb-1 text-xl font-semibold leading-5 tracking-wide">
                OAuth client updation form
              </h1>
              <p className="text-default text-sm ltr:mr-4 rtl:ml-4">
                This is the form to edit an existing OAuth client
              </p>
            </div>
          </div>
          <EditOAuthClientForm clientId={clientId} />
        </div>
      </Shell>
    </div>
  );
}

EditOAuthClient.PageWrapper = PageWrapper;
