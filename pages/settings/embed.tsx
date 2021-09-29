import { GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/client";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Loader from "@components/Loader";
import SettingsShell from "@components/Settings";
import Shell from "@components/Shell";

export default function Embed(props: inferSSRProps<typeof getServerSideProps>) {
  const [, loading] = useSession();

  if (loading) {
    return <Loader />;
  }

  const iframeTemplate = `<iframe src="${process.env.NEXT_PUBLIC_APP_URL}/${props.user?.username}" frameborder="0" allowfullscreen></iframe>`;
  const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Schedule a meeting</title><style>body {margin: 0;}iframe {height: calc(100vh - 4px);width: calc(100vw - 4px);box-sizing: border-box;}</style></head><body>${iframeTemplate}</body></html>`;

  return (
    <Shell heading="Embed" subtitle="Integrate with your website using our embed options.">
      <SettingsShell>
        <div className="py-6 lg:pb-8 lg:col-span-9">
          <div className="mb-6">
            <h2 className="font-cal text-lg leading-6 font-medium text-gray-900">iframe Embed</h2>
            <p className="mt-1 text-sm text-gray-500">The easiest way to embed Cal.com on your website.</p>
          </div>
          <div className="grid grid-cols-2 space-x-4">
            <div>
              <label htmlFor="iframe" className="block text-sm font-medium text-gray-700">
                Standard iframe
              </label>
              <div className="mt-1">
                <textarea
                  id="iframe"
                  className="h-32 shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-sm"
                  placeholder="Loading..."
                  defaultValue={iframeTemplate}
                  readOnly
                />
              </div>
            </div>
            <div>
              <label htmlFor="fullscreen" className="block text-sm font-medium text-gray-700">
                Responsive full screen iframe
              </label>
              <div className="mt-1">
                <textarea
                  id="fullscreen"
                  className="h-32 shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-sm"
                  placeholder="Loading..."
                  defaultValue={htmlTemplate}
                  readOnly
                />
              </div>
            </div>
          </div>
          <div className="my-6">
            <h2 className="font-cal text-lg leading-6 font-medium text-gray-900">Cal.com API</h2>
            <p className="mt-1 text-sm text-gray-500">
              Leverage our API for full control and customizability.
            </p>
          </div>
          <a href="https://developer.cal.com/api" className="btn btn-primary">
            Browse our API documentation
          </a>
        </div>
      </SettingsShell>
    </Shell>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  if (!session?.user?.email) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
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

  return {
    props: { session, user },
  };
}
