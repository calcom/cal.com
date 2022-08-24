import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useMemo, useState, Fragment } from "react";

import getApps from "@calcom/app-store/utils";
import classNames from "@calcom/lib/classNames";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import Avatar from "@calcom/ui/v2/core/Avatar";
import Badge from "@calcom/ui/v2/core/Badge";
import { Button } from "@calcom/ui/v2/core/Button";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/v2/core/Dropdown";
import Loader from "@calcom/ui/v2/core/Loader";
import Switch from "@calcom/ui/v2/core/Switch";
import TimezoneSelect from "@calcom/ui/v2/core/TimezoneSelect";
import ColorPicker from "@calcom/ui/v2/core/colorpicker";
import Select from "@calcom/ui/v2/core/form/Select";
import { TextField, Form, Label } from "@calcom/ui/v2/core/form/fields";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import showToast from "@calcom/ui/v2/core/notfications";
import { List } from "@calcom/ui/v2/modules/List";
import DisconnectIntegration from "@calcom/ui/v2/modules/integrations/DisconnectIntegration";

import { QueryCell } from "@lib/QueryCell";
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
      {/* <List>
        {apps.map((item) => (
          <Fragment key={item.credentialId}>
            <IntegrationListItem
              slug={item.slug}
              title={item.title}
              logo={item.logo}
              description={item.description}
              actions={<DisconnectIntegration credentialId={item.credentialId} />}
            />
          </Fragment>
        ))}
      </List> */}
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
