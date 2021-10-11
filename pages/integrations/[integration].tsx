import { useSession } from "next-auth/client";
import { useRouter } from "next/router";

import { getSession } from "@lib/auth";
import { getIntegrationName, getIntegrationType } from "@lib/integrations";
import prisma from "@lib/prisma";

import Loader from "@components/Loader";
import Shell from "@components/Shell";

export default function Integration(props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();

  if (loading) {
    return <Loader />;
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
        heading={t("name_app_prop")}
        subtitle={t("manage_delete_this_app")}>
        <div className="block grid-cols-3 gap-4 sm:grid">
          <div className="col-span-2 mb-6 overflow-hidden bg-white border border-gray-200 rounded-sm">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">{t("integrations_details")}</h3>
              <p className="max-w-2xl mt-1 text-sm text-gray-500">
                {t("name_app_description")}
              </p>
            </div>
            <div className="px-4 py-5 border-t border-gray-200 sm:px-6">
              <dl className="grid gap-y-8">
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t("app_name")}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{getIntegrationName(props.integration.type)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t("app_category")}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{getIntegrationType(props.integration.type)}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div>
            <div className="mb-6 bg-white border border-gray-200 rounded-sm">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{t("delete_this_app")}</h3>
                <div className="max-w-xl mt-2 text-sm text-gray-500">
                  <p>{t("delete_this_app_description")}</p>
                </div>
                <div className="mt-5">
                  <button
                    onClick={deleteIntegrationHandler}
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 font-medium text-red-700 bg-red-100 border border-transparent rounded-sm hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm">
                    {t("delete_app")}
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
    props: { session, integration },
  };
}
