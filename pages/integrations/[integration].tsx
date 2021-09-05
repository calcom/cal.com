import prisma from "@lib/prisma";
import { getIntegrationName, getIntegrationType } from "@lib/integrations";
import Shell from "@components/Shell";
import { useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/client";
import Loader from "@components/Loader";
import { getSession } from "@lib/auth";

export default function Integration(props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();

  const [showAPIKey, setShowAPIKey] = useState(false);

  if (loading) {
    return <Loader />;
  }

  function toggleShowAPIKey() {
    setShowAPIKey(!showAPIKey);
  }

  async function deleteIntegrationHandler(event) {
    event.preventDefault();

    /*eslint-disable */
    const response = await fetch("/api/integrations", {
      method: "DELETE",
      body: JSON.stringify({ id: props.integration.id }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    /*eslint-enable */

    router.push("/integrations");
  }

  return (
    <div>
      <Shell
        heading={`${getIntegrationName(props.integration.type)} App`}
        subtitle="Manage and delete this app.">
        <div className="block sm:grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white border border-gray-200 mb-6 overflow-hidden rounded-sm">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Integration Details</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Information about your {getIntegrationName(props.integration.type)} App.
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid gap-y-8">
                <div>
                  <dt className="text-sm font-medium text-gray-500">App name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{getIntegrationName(props.integration.type)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">App Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{getIntegrationType(props.integration.type)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">API Key</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {!showAPIKey ? (
                      <span>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
                    ) : (
                      <div>
                        <textarea
                          name="apikey"
                          rows={6}
                          className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                          readOnly>
                          {JSON.stringify(props.integration.key)}
                        </textarea>
                      </div>
                    )}
                    <button
                      onClick={toggleShowAPIKey}
                      className="ml-2 font-medium text-neutral-900 hover:text-neutral-700">
                      {!showAPIKey ? "Show" : "Hide"}
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div>
            <div className="bg-white border border-gray-200 mb-6 rounded-sm">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Delete this app</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Once you delete this app, it will be permanently removed.</p>
                </div>
                <div className="mt-5">
                  <button
                    onClick={deleteIntegrationHandler}
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-sm text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm">
                    Delete App
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}

export async function getServerSideProps(context) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const session = await getSession(context);

  const integration = await prisma.credential.findFirst({
    where: {
      id: parseInt(context.query.integration),
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });
  return {
    props: { integration }, // will be passed to the page component as props
  };
}
