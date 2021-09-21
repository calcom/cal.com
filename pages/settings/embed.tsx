import prisma from "@lib/prisma";
import Shell from "@components/Shell";
import T from "@components/T";
import { useIntl } from "react-intl";
import { useRouter } from "next/router";
import SettingsShell from "@components/Settings";
import { useSession } from "next-auth/client";
import Loader from "@components/Loader";
import { getSession } from "@lib/auth";

export default function Embed(props) {
  const [session, loading] = useSession();
  const { locale = "en" } = useRouter();
  const intl = useIntl();
  if (loading) {
    return <Loader />;
  }

  return (
    <Shell
      headingId="embed"
      heading="Embed"
      subtitleId="integrateWithYourWebsite"
      subtitle="Integrate with your website using our embed options.">
      <SettingsShell>
        <div className="py-6 lg:pb-8 lg:col-span-9">
          <div className="mb-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              <T>iframe Embed</T>
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              <T id="embedCalendsoOnYourWebsite">The easiest way to embed Calendso on your website.</T>
            </p>
          </div>
          <div className="grid grid-cols-2 space-x-4">
            <div>
              <label htmlFor="iframe" className="block text-sm font-medium text-gray-700">
                <T>Standard iframe</T>
              </label>
              <div className="mt-1">
                <textarea
                  id="iframe"
                  className="h-32 shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-sm"
                  placeholder={intl.formatMessage({
                    id: "loading",
                    defaultMessage: "Loading...",
                    description: "Loading...",
                  })}
                  defaultValue={`<iframe src="${props.BASE_URL}/${session?.user?.username}" frameborder="0" allowfullscreen></iframe>`}
                  readOnly
                />
              </div>
            </div>
            <div>
              <label htmlFor="fullscreen" className="block text-sm font-medium text-gray-700">
                <T>Responsive full screen iframe</T>
              </label>
              <div className="mt-1">
                <textarea
                  id="fullscreen"
                  className="h-32 shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-sm"
                  placeholder={intl.formatMessage({
                    id: "loading",
                    defaultMessage: "Loading...",
                    description: "Loading...",
                  })}
                  defaultValue={[
                    `<!DOCTYPE html>`,
                    `<html lang="${locale}">`,
                    `<head>`,
                    `<meta charset="UTF-8">`,
                    `<meta http-equiv="X-UA-Compatible" content="IE=edge">`,
                    `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
                    `<title>Schedule a meeting</title>`, // TODO: translate
                    `<style>body {margin: 0;}iframe {height: calc(100vh - 4px);width: calc(100vw - 4px);box-sizing: border-box;}</style>`,
                    `</head>`,
                    `<body>`,
                    `<iframe src="${props.BASE_URL}/"frameborder="0" allowfullscreen></iframe>`,
                    `</body>`,
                    `</html>`,
                  ].join("")}
                  readOnly
                />
              </div>
            </div>
          </div>
          <div className="my-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Calendso API</h2>
            <p className="mt-1 text-sm text-gray-500">
              <T id="leverageControlAndCustomizability">
                Leverage our API for full control and customizability.
              </T>
            </p>
          </div>
          <a href="https://developer.cal.com/api" className="btn btn-primary">
            <T id="browseOurDocumentation">Browse our API documentation</T>
          </a>
        </div>
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session?.user?.email,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
    },
  });

  const { BASE_URL } = process.env;

  return {
    props: { user, BASE_URL }, // will be passed to the page component as props
  };
}
