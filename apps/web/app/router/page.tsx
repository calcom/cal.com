import { withAppDirSsr } from "app/WithAppDirSsr";
import { type PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/router/getServerSideProps";

const getData = withAppDirSsr(getServerSideProps);

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const ctx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const data = await getData(ctx);
  const { form } = data;
  return await _generateMetadata(
    () => `${form.name} | Cal.com Forms`,
    () => ""
  );
};
export default async function Router({ params, searchParams }: PageProps) {
  const ctx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const { message } = await getData(ctx);
  return (
    <div className="mx-auto my-0 max-w-3xl md:my-24">
      <div className="w-full max-w-4xl ltr:mr-2 rtl:ml-2">
        <div className="text-default bg-default -mx-4 rounded-sm border border-neutral-200 p-4 py-6 sm:mx-0 sm:px-8">
          <div>{message}</div>
        </div>
      </div>
    </div>
  );
}
