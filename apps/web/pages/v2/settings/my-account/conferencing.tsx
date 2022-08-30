import { GetServerSidePropsContext } from "next";

import getApps from "@calcom/app-store/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { Icon } from "@calcom/ui";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import DisconnectIntegration from "@calcom/ui/v2/modules/integrations/DisconnectIntegration";

import { getSession } from "@lib/auth";
import { inferSSRProps } from "@lib/types/inferSSRProps";

const ConferencingLayout = (props: inferSSRProps<typeof getServerSideProps>) => {
  const { t } = useLocale();

  const { apps } = props;

  // Error reason: getaddrinfo EAI_AGAIN http
  // const query = trpc.useQuery(["viewer.integrations", { variant: "conferencing", onlyInstalled: true }], {
  //   suspense: true,
  // });

  return (
    <div className="m-4 rounded-md border-neutral-200 bg-white sm:mx-0  md:border xl:mt-0">
      <Meta title="conferencing" description="conferencing_description" />
      {apps.map((app) => (
        <div
          key={app.title}
          className="flex w-full flex-1 items-center space-x-3 border-b py-5  rtl:space-x-reverse">
          <img className="h-10 w-10" src={app.logo} alt={app.title} />

          <div className="flex-grow truncate pl-2">
            <h3 className="truncate text-sm font-medium text-neutral-900">{app.title}</h3>
            <p className="truncate text-sm text-gray-500">{app.description}</p>
          </div>

          <Dropdown>
            <DropdownMenuTrigger className="focus:ring-brand-900 mr-4 block h-[36px] w-auto justify-center rounded-md border border-gray-200 bg-transparent text-gray-700 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1">
              <Icon.FiMoreHorizontal className="group-hover:text-gray-800" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <DisconnectIntegration
                  credentialId={app.credentialId}
                  label={t("remove_app")}
                  trashIcon
                  isGlobal={app.isGlobal}
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Dropdown>
        </div>
      ))}
    </div>
  );
};

ConferencingLayout.getLayout = getLayout;

export default ConferencingLayout;

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const videoCredentials = await prisma.credential.findMany({
    where: {
      userId: session.user.id,
      app: {
        categories: {
          has: "video",
        },
      },
    },
  });

  const apps = getApps(videoCredentials)
    .filter((app) => {
      return app.variant === "conferencing" && app.credentials.length;
    })
    .map((app) => {
      return {
        slug: app.slug,
        title: app.title,
        logo: app.logo,
        description: app.description,
        credentialId: app.credentials[0].id,
        isGlobal: app.isGlobal,
      };
    });

  return { props: { apps } };
};
